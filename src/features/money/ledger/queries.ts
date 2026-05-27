import "server-only";

import { Types } from "mongoose";

import { connectMongoose } from "@/lib/db/client";
import {
  Client,
  FinanceEntry,
  Project,
  type FinanceEntryDoc,
} from "@/lib/db/models";

import type { FinanceKind } from "../schemas";
import type { FinanceEntryRow, MoneyOverview } from "../types";

/**
 * Query helpers for the Money → Ledger tab.
 *
 * Returns plain JSON shapes (no Mongoose documents leak to client
 * components). Aggregations live next to the listing helpers because
 * the Overview KPIs and the ledger toolbar both read the same source.
 */

export interface LedgerFilters {
  /** Free-text across description + category. */
  search?: string;
  kind?: FinanceKind | "any";
  category?: string | "any";
  clientId?: string | "any" | "none";
  projectId?: string | "any" | "none";
  /** Inclusive ISO date strings (yyyy-mm-dd). */
  from?: string | null;
  to?: string | null;
  /** Drop synced invoice rows from the listing — handy when the user
   *  only wants their manual entries. */
  hideInvoiceSynced?: boolean;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// ────────────────────────────────────────────────────────────
// Listing
// ────────────────────────────────────────────────────────────

export async function listFinanceEntries(
  organizationId: string,
  filters: LedgerFilters = {},
): Promise<FinanceEntryRow[]> {
  await connectMongoose();

  const query = buildLedgerQuery(organizationId, filters);

  const docs = await FinanceEntry.find(query)
    .sort({ occurredOn: -1, createdAt: -1 })
    .limit(500)
    .lean<FinanceEntryDoc[]>();

  if (docs.length === 0) return [];

  return hydrateEntries(docs);
}

/** Distinct category list — powers the toolbar dropdown. */
export async function listLedgerCategories(
  organizationId: string,
): Promise<string[]> {
  await connectMongoose();
  const cats = await FinanceEntry.distinct<string>("category", {
    organizationId,
    deletedAt: null,
  });
  return cats.filter(Boolean).sort((a, b) => a.localeCompare(b));
}

// ────────────────────────────────────────────────────────────
// Stats
// ────────────────────────────────────────────────────────────

export interface LedgerStats {
  count: number;
  incomeUsd: number;
  expenseUsd: number;
  netUsd: number;
  taxDeductibleUsd: number;
}

/** Totals aggregated over the same filter set the table shows. */
export async function getLedgerStats(
  organizationId: string,
  filters: LedgerFilters = {},
): Promise<LedgerStats> {
  await connectMongoose();

  const match = buildLedgerQuery(organizationId, filters);

  const [agg] = (await FinanceEntry.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        incomeUsd: {
          $sum: {
            $cond: [{ $eq: ["$kind", "income"] }, "$amountUsd", 0],
          },
        },
        expenseUsd: {
          $sum: {
            $cond: [{ $eq: ["$kind", "expense"] }, "$amountUsd", 0],
          },
        },
        taxDeductibleUsd: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$kind", "expense"] },
                  { $eq: ["$taxDeductible", true] },
                ],
              },
              "$amountUsd",
              0,
            ],
          },
        },
      },
    },
  ])) as Array<{
    count: number;
    incomeUsd: number;
    expenseUsd: number;
    taxDeductibleUsd: number;
  }>;

  return {
    count: agg?.count ?? 0,
    incomeUsd: round(agg?.incomeUsd ?? 0),
    expenseUsd: round(agg?.expenseUsd ?? 0),
    netUsd: round((agg?.incomeUsd ?? 0) - (agg?.expenseUsd ?? 0)),
    taxDeductibleUsd: round(agg?.taxDeductibleUsd ?? 0),
  };
}

// ────────────────────────────────────────────────────────────
// Recurring reminders
// ────────────────────────────────────────────────────────────

export interface RecurringReminderRow {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  currency: "USD" | "BDT";
  amountUsd: number;
  cadence: "monthly" | "yearly";
  /** ISO date when the next reminder should surface. */
  nextReminderAt: string;
  /** Last-known `occurredOn` (the original entry date). */
  lastOccurredOn: string;
}

/**
 * Reminder candidates: entries flagged recurring whose
 * `nextReminderAt` is within the next 14 days. Surfaces a "due to
 * log" hint at the top of the ledger so the user manually re-creates
 * the entry (we never auto-post per the locked decision).
 */
export async function listRecurringReminders(
  organizationId: string,
  now: Date = new Date(),
): Promise<RecurringReminderRow[]> {
  await connectMongoose();

  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 14);

  const docs = await FinanceEntry.find({
    organizationId,
    deletedAt: null,
    "recurring.cadence": { $in: ["monthly", "yearly"] },
    "recurring.nextReminderAt": { $lte: horizon, $gte: stripTime(now) },
  })
    .sort({ "recurring.nextReminderAt": 1 })
    .limit(50)
    .lean<FinanceEntryDoc[]>();

  return docs.map((d) => ({
    id: d._id.toString(),
    category: String(d.category ?? ""),
    description: d.description ?? null,
    amount: Number(d.amount ?? 0),
    currency: d.currency,
    amountUsd: Number(d.amountUsd ?? 0),
    cadence: (d.recurring?.cadence === "yearly"
      ? "yearly"
      : "monthly") as "monthly" | "yearly",
    nextReminderAt: (d.recurring?.nextReminderAt ?? new Date()).toISOString(),
    lastOccurredOn: new Date(d.occurredOn).toISOString(),
  }));
}

// ────────────────────────────────────────────────────────────
// Money overview (replaces sub-phase 8a's demo data)
// ────────────────────────────────────────────────────────────

export async function getMoneyOverview(
  organizationId: string,
  anchor: Date = new Date(),
): Promise<MoneyOverview> {
  await connectMongoose();

  const monthStart = new Date(anchor);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const sixMonthsAgo = new Date(anchor);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const orgId = new Types.ObjectId(organizationId);

  const monthAggPromise = FinanceEntry.aggregate([
    {
      $match: {
        organizationId: orgId,
        deletedAt: null,
        occurredOn: { $gte: monthStart },
      },
    },
    {
      $group: {
        _id: "$kind",
        usd: { $sum: "$amountUsd" },
      },
    },
  ]);

  const seriesAggPromise = FinanceEntry.aggregate([
    {
      $match: {
        organizationId: orgId,
        deletedAt: null,
        occurredOn: { $gte: sixMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$occurredOn" },
          month: { $month: "$occurredOn" },
          kind: "$kind",
        },
        usd: { $sum: "$amountUsd" },
      },
    },
  ]);

  const [monthAgg, seriesAgg] = await Promise.all([
    monthAggPromise,
    seriesAggPromise,
  ]);

  let monthIncome = 0;
  let monthExpense = 0;
  for (const row of monthAgg as Array<{ _id: string; usd: number }>) {
    if (row._id === "income") monthIncome = row.usd;
    if (row._id === "expense") monthExpense = row.usd;
  }

  // Build the 6-month series scaffold and fill from the aggregate.
  const series: MoneyOverview["series"] = [];
  const cursor = new Date(sixMonthsAgo);
  for (let i = 0; i < 6; i++) {
    series.push({
      label: MONTH_LABELS[cursor.getMonth()],
      income: 0,
      expense: 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  for (const row of seriesAgg as Array<{
    _id: { year: number; month: number; kind: FinanceKind };
    usd: number;
  }>) {
    const idx =
      (row._id.year - sixMonthsAgo.getFullYear()) * 12 +
      (row._id.month - 1) -
      sixMonthsAgo.getMonth();
    if (idx < 0 || idx >= 6) continue;
    if (row._id.kind === "income") series[idx].income = round(row.usd);
    else if (row._id.kind === "expense") series[idx].expense = round(row.usd);
  }

  return {
    monthIncome: round(monthIncome),
    monthExpense: round(monthExpense),
    monthNet: round(monthIncome - monthExpense),
    // Phase 8c will populate these from invoices + subscriptions.
    outstandingInvoicesUsd: 0,
    outstandingInvoicesCount: 0,
    retainerMrrUsd: 0,
    series,
  };
}

// ────────────────────────────────────────────────────────────
// Single entry
// ────────────────────────────────────────────────────────────

export async function getFinanceEntry(
  organizationId: string,
  entryId: string,
): Promise<FinanceEntryRow | null> {
  await connectMongoose();
  const doc = await FinanceEntry.findOne({
    _id: entryId,
    organizationId,
    deletedAt: null,
  }).lean<FinanceEntryDoc | null>();

  if (!doc) return null;
  const [hydrated] = await hydrateEntries([doc]);
  return hydrated ?? null;
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function buildLedgerQuery(
  organizationId: string,
  filters: LedgerFilters,
): Record<string, unknown> {
  const query: Record<string, unknown> = {
    organizationId,
    deletedAt: null,
  };

  if (filters.kind && filters.kind !== "any") {
    query.kind = filters.kind;
  }

  if (filters.category && filters.category !== "any") {
    query.category = filters.category;
  }

  if (filters.clientId === "none") {
    query.clientId = null;
  } else if (filters.clientId && filters.clientId !== "any") {
    query.clientId = new Types.ObjectId(filters.clientId);
  }

  if (filters.projectId === "none") {
    query.projectId = null;
  } else if (filters.projectId && filters.projectId !== "any") {
    query.projectId = new Types.ObjectId(filters.projectId);
  }

  if (filters.hideInvoiceSynced) {
    query.source = "manual";
  }

  if (filters.from || filters.to) {
    const occurredOn: Record<string, Date> = {};
    if (filters.from) occurredOn.$gte = new Date(filters.from);
    if (filters.to) {
      const end = new Date(filters.to);
      end.setHours(23, 59, 59, 999);
      occurredOn.$lte = end;
    }
    query.occurredOn = occurredOn;
  }

  if (filters.search?.trim()) {
    const escaped = filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "i");
    query.$or = [{ description: re }, { category: re }];
  }

  return query;
}

async function hydrateEntries(
  docs: FinanceEntryDoc[],
): Promise<FinanceEntryRow[]> {
  const clientIds = unique(
    docs
      .map((d) => d.clientId)
      .filter((id): id is Types.ObjectId => Boolean(id))
      .map((id) => id.toString()),
  );
  const projectIds = unique(
    docs
      .map((d) => d.projectId)
      .filter((id): id is Types.ObjectId => Boolean(id))
      .map((id) => id.toString()),
  );

  const [clients, projects] = await Promise.all([
    clientIds.length
      ? Client.find({ _id: { $in: clientIds } })
          .select("name company")
          .lean()
      : [],
    projectIds.length
      ? Project.find({ _id: { $in: projectIds } })
          .select("name")
          .lean()
      : [],
  ]);

  const clientMap = new Map<string, string>(
    clients.map((c) => [
      c._id.toString(),
      String(c.company || c.name || ""),
    ]),
  );
  const projectMap = new Map<string, string>(
    projects.map((p) => [p._id.toString(), String(p.name || "")]),
  );

  return docs.map((d) => {
    const id = d._id.toString();
    const clientId = d.clientId ? d.clientId.toString() : null;
    const projectId = d.projectId ? d.projectId.toString() : null;
    return {
      id,
      kind: d.kind,
      category: String(d.category ?? ""),
      occurredOn: new Date(d.occurredOn).toISOString(),
      description: d.description ?? null,

      amount: Number(d.amount ?? 0),
      currency: d.currency,
      amountUsd: Number(d.amountUsd ?? 0),
      exchangeRate: Number(d.exchangeRate ?? 1),
      rateDate: String(d.rateDate ?? ""),

      taxDeductible: Boolean(d.taxDeductible),
      taxCategory: d.taxCategory ?? null,

      recurring: {
        cadence: d.recurring?.cadence ?? "none",
        nextReminderAt: d.recurring?.nextReminderAt
          ? new Date(d.recurring.nextReminderAt).toISOString()
          : null,
      },

      receiptUrl: d.receiptUrl ?? null,

      clientId,
      clientLabel: clientId ? clientMap.get(clientId) ?? null : null,
      projectId,
      projectLabel: projectId ? projectMap.get(projectId) ?? null : null,
      invoiceId: d.invoiceId ? d.invoiceId.toString() : null,

      source: d.source,
      createdBy: d.createdBy ? d.createdBy.toString() : null,
      createdAt: new Date(d.createdAt as unknown as Date).toISOString(),
      updatedAt: new Date(d.updatedAt as unknown as Date).toISOString(),
    };
  });
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function stripTime(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}
