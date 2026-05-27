import "server-only";

import { Types } from "mongoose";

import { connectMongoose } from "@/lib/db/client";
import { Client, Invoice, Project } from "@/lib/db/models";
import type { InvoiceRow } from "../types";
import type { InvoiceStatus } from "../schemas";

/**
 * Query helpers for the Money → Invoices tab.
 *
 * Returns plain JSON shapes (no Mongoose documents leak to client
 * components). The `InvoiceRow` type includes hydrated client + project
 * labels for display.
 */

export interface InvoiceFilters {
  search?: string;
  status?: InvoiceStatus | "any" | "overdue";
  clientId?: string | "any";
  projectId?: string | "any";
  from?: string | null;
  to?: string | null;
}

// ────────────────────────────────────────────────────────────
// Listing
// ────────────────────────────────────────────────────────────

export async function listInvoices(
  organizationId: string,
  filters: InvoiceFilters = {},
): Promise<InvoiceRow[]> {
  await connectMongoose();

  const query = buildInvoiceQuery(organizationId, filters);

  const docs = await Invoice.find(query)
    .sort({ issueDate: -1, createdAt: -1 })
    .limit(500)
    .lean();

  if (docs.length === 0) return [];

  return hydrateInvoices(docs);
}

// ────────────────────────────────────────────────────────────
// Single invoice
// ────────────────────────────────────────────────────────────

export async function getInvoiceById(
  organizationId: string,
  invoiceId: string,
): Promise<InvoiceRow | null> {
  await connectMongoose();
  const doc = await Invoice.findOne({
    _id: invoiceId,
    organizationId,
    deletedAt: null,
  }).lean();

  if (!doc) return null;
  const [hydrated] = await hydrateInvoices([doc]);
  return hydrated ?? null;
}

/**
 * Public portal lookup by share token.
 *
 * Used by Phase 10 client portal — implement now, consume later.
 * Returns the invoice if the token matches and the invoice isn't deleted.
 */
export async function getInvoiceByShareToken(
  shareToken: string,
): Promise<InvoiceRow | null> {
  await connectMongoose();
  const doc = await Invoice.findOne({
    shareToken,
    deletedAt: null,
  }).lean();

  if (!doc) return null;

  // Mark as viewed if status is "sent" (first portal access).
  if (doc.status === "sent") {
    await Invoice.updateOne(
      { _id: doc._id },
      { status: "viewed", viewedAt: new Date() },
    );
    doc.status = "viewed";
    doc.viewedAt = new Date();
  }

  const [hydrated] = await hydrateInvoices([doc]);
  return hydrated ?? null;
}

// ────────────────────────────────────────────────────────────
// Stats
// ────────────────────────────────────────────────────────────

export interface InvoiceStats {
  total: number;
  draft: number;
  sent: number;
  paid: number;
  overdue: number;
  outstandingUsd: number;
}

export async function getInvoiceStats(
  organizationId: string,
): Promise<InvoiceStats> {
  await connectMongoose();

  const now = new Date();

  const [agg] = (await Invoice.aggregate([
    { $match: { organizationId: new Types.ObjectId(organizationId), deletedAt: null } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        draft: {
          $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] },
        },
        sent: {
          $sum: { $cond: [{ $eq: ["$status", "sent"] }, 1, 0] },
        },
        paid: {
          $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] },
        },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $in: ["$status", ["sent", "viewed"]] },
                  { $lt: ["$dueDate", now] },
                ],
              },
              1,
              0,
            ],
          },
        },
        outstandingUsd: {
          $sum: {
            $cond: [
              { $in: ["$status", ["sent", "viewed"]] },
              "$totalUsd",
              0,
            ],
          },
        },
      },
    },
  ])) as Array<{
    total: number;
    draft: number;
    sent: number;
    paid: number;
    overdue: number;
    outstandingUsd: number;
  }>;

  return {
    total: agg?.total ?? 0,
    draft: agg?.draft ?? 0,
    sent: agg?.sent ?? 0,
    paid: agg?.paid ?? 0,
    overdue: agg?.overdue ?? 0,
    outstandingUsd: round(agg?.outstandingUsd ?? 0),
  };
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function buildInvoiceQuery(
  organizationId: string,
  filters: InvoiceFilters,
): Record<string, unknown> {
  const query: Record<string, unknown> = {
    organizationId,
    deletedAt: null,
  };

  if (filters.status && filters.status !== "any") {
    if (filters.status === "overdue") {
      // Overdue is a computed status: sent/viewed + past due date.
      query.status = { $in: ["sent", "viewed"] };
      query.dueDate = { $lt: new Date() };
    } else {
      query.status = filters.status;
    }
  }

  if (filters.clientId && filters.clientId !== "any") {
    query.clientId = new Types.ObjectId(filters.clientId);
  }

  if (filters.projectId === "none") {
    query.projectId = null;
  } else if (filters.projectId && filters.projectId !== "any") {
    query.projectId = new Types.ObjectId(filters.projectId);
  }

  if (filters.from || filters.to) {
    const issueDate: Record<string, Date> = {};
    if (filters.from) issueDate.$gte = new Date(filters.from);
    if (filters.to) {
      const end = new Date(filters.to);
      end.setHours(23, 59, 59, 999);
      issueDate.$lte = end;
    }
    query.issueDate = issueDate;
  }

  if (filters.search?.trim()) {
    const escaped = filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "i");
    query.$or = [{ number: re }, { notes: re }];
  }

  return query;
}

async function hydrateInvoices(docs: any[]): Promise<InvoiceRow[]> {
  const clientIds = unique(
    docs.map((d) => d.clientId?.toString()).filter(Boolean),
  );
  const projectIds = unique(
    docs
      .map((d) => d.projectId?.toString())
      .filter(Boolean),
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
    const clientId = d.clientId ? d.clientId.toString() : "";
    const projectId = d.projectId ? d.projectId.toString() : null;
    const subscriptionId = d.subscriptionId ? d.subscriptionId.toString() : null;

    return {
      id,
      number: String(d.number ?? ""),
      prefix: String(d.prefix ?? ""),
      sequence: Number(d.sequence ?? 0),
      clientId,
      clientLabel: clientMap.get(clientId) ?? null,
      projectId,
      projectLabel: projectId ? projectMap.get(projectId) ?? null : null,
      subscriptionId,
      status: d.status,
      issueDate: new Date(d.issueDate).toISOString(),
      dueDate: new Date(d.dueDate).toISOString(),
      sentAt: d.sentAt ? new Date(d.sentAt).toISOString() : null,
      viewedAt: d.viewedAt ? new Date(d.viewedAt).toISOString() : null,
      paidDate: d.paidDate ? new Date(d.paidDate).toISOString() : null,
      voidedAt: d.voidedAt ? new Date(d.voidedAt).toISOString() : null,
      items: (d.items ?? []).map((item: any) => ({
        description: String(item.description ?? ""),
        quantity: Number(item.quantity ?? 0),
        unitPrice: Number(item.unitPrice ?? 0),
        lineTotal: Number(item.lineTotal ?? 0),
      })),
      taxRateOverride: d.taxRateOverride !== null ? Number(d.taxRateOverride) : null,
      subtotal: Number(d.subtotal ?? 0),
      tax: Number(d.tax ?? 0),
      total: Number(d.total ?? 0),
      currency: d.currency,
      totalUsd: Number(d.totalUsd ?? 0),
      exchangeRate: Number(d.exchangeRate ?? 1),
      rateDate: String(d.rateDate ?? ""),
      notes: d.notes ?? null,
      terms: d.terms ?? null,
      shareToken: String(d.shareToken ?? ""),
      createdBy: d.createdBy ? d.createdBy.toString() : null,
      createdAt: new Date(d.createdAt).toISOString(),
      updatedAt: new Date(d.updatedAt).toISOString(),
    };
  });
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
