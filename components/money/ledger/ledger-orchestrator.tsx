"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowDownLeft, ArrowUpRight, Plus, Receipt, Wallet } from "lucide-react";

import { LedgerFormDialog } from "./ledger-form-dialog";
import { LedgerTable } from "./ledger-table";
import {
  LedgerToolbar,
  type LedgerFilterState,
} from "./ledger-toolbar";
import { RecurringReminderCard } from "./recurring-reminder-card";
import { EmptyState } from "@/components/layout/empty-state";
import { Money } from "@/components/money/money";
import { StatTile } from "@/components/money/stat-tile";
import type {
  LedgerStats,
  RecurringReminderRow,
} from "@/features/money/ledger/queries";
import type { FinanceEntryRow } from "@/features/money/types";
import type { Locale } from "@/i18n/routing";
import type {
  FinanceKind,
  FinanceRecurringCadence,
} from "@/features/money/schemas";
import type { Currency } from "@/lib/currency/types";

interface ClientOption {
  id: string;
  name: string;
  company: string | null;
}
interface ProjectOption {
  id: string;
  name: string;
  clientLabel: string | null;
}

interface Props {
  locale: Locale;
  initialEntries: FinanceEntryRow[];
  reminders: RecurringReminderRow[];
  stats: LedgerStats;
  categories: string[];
  clients: ClientOption[];
  projects: ProjectOption[];
  canManage: boolean;
  /** Initial filter values resolved server-side from URL params. */
  initialFilters: LedgerFilterState;
}

/**
 * Top-level state owner for the Ledger tab.
 *
 * Server resolves the filter state from URL params, runs the queries,
 * and hands us the materialised rows + KPIs. We keep the filters in
 * local state for snappy UX; whenever the user changes a filter we push
 * the new params into the URL with `replace` (no history pollution),
 * which triggers the server page to re-run the query.
 */
export function LedgerOrchestrator({
  locale,
  initialEntries,
  reminders,
  stats,
  categories,
  clients,
  projects,
  canManage,
  initialFilters,
}: Props) {
  const t = useTranslations("Money.ledger");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<LedgerFilterState>(initialFilters);
  const deferredFilters = useDeferredValue(filters);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinanceEntryRow | null>(
    null,
  );
  const [seedEntry, setSeedEntry] = useState<FinanceEntryRow | null>(null);

  // Whenever the deferred filters drift away from the URL, push them.
  // Server re-renders, which flushes new initialEntries down through props.
  useEffect(() => {
    const next = serializeFilters(deferredFilters);
    const current = searchParams?.toString() ?? "";
    if (next === current) return;

    const url = next ? `${pathname}?${next}` : pathname;
    router.replace(url, { scroll: false });
    // We deliberately depend only on `deferredFilters` — pathname/router
    // don't change while the page is mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredFilters]);

  const openCreate = useCallback(() => {
    setEditingEntry(null);
    setSeedEntry(null);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((entry: FinanceEntryRow) => {
    setSeedEntry(null);
    setEditingEntry(entry);
    setDialogOpen(true);
  }, []);

  const openLogAgain = useCallback((reminder: RecurringReminderRow) => {
    // Build a fresh entry shape from the reminder so the form opens
    // with sensible defaults. Server treats this as a brand-new create.
    setEditingEntry(null);
    setSeedEntry(reminderToSeed(reminder));
    setDialogOpen(true);
  }, []);

  const hasAnyFilter = useMemo(() => isFiltered(filters), [filters]);
  const hasResults = initialEntries.length > 0;

  return (
    <div className="space-y-5">
      {/* Header CTA — keeps Ledger tab above the toolbar. */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">
            {t("title")}
          </h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {t("subtitle")}
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-glow)] hover:opacity-90 focus-ring"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("newEntry")}
          </button>
        )}
      </header>

      {/* KPI strip — always reflects the *filtered* totals. */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={Wallet}
          label={t("stats.net")}
          value={
            <Money amount={stats.netUsd} currency="USD" compact noTooltip />
          }
          variant="tinted"
          tint={stats.netUsd >= 0 ? "success" : "danger"}
        />
        <StatTile
          icon={ArrowDownLeft}
          label={t("stats.income")}
          value={
            <Money amount={stats.incomeUsd} currency="USD" compact noTooltip />
          }
          variant="tinted"
          tint="primary"
        />
        <StatTile
          icon={ArrowUpRight}
          label={t("stats.expense")}
          value={
            <Money
              amount={stats.expenseUsd}
              currency="USD"
              compact
              noTooltip
            />
          }
        />
        <StatTile
          icon={Receipt}
          label={t("stats.deductible")}
          value={
            <Money
              amount={stats.taxDeductibleUsd}
              currency="USD"
              compact
              noTooltip
            />
          }
          variant="tinted"
          tint="warning"
        />
      </section>

      {reminders.length > 0 && (
        <RecurringReminderCard
          locale={locale}
          reminders={reminders}
          onLogAgain={openLogAgain}
        />
      )}

      <LedgerToolbar
        filters={filters}
        onFiltersChange={setFilters}
        categories={categories}
        clients={clients}
        projects={projects}
      />

      {hasResults ? (
        <LedgerTable
          locale={locale}
          entries={initialEntries}
          canManage={canManage}
          onEdit={openEdit}
        />
      ) : hasAnyFilter ? (
        <EmptyState
          icon={Receipt}
          variant="filtered"
          title={t("filtered.title")}
          description={t("filtered.subtitle")}
        />
      ) : (
        <EmptyState
          icon={Receipt}
          title={t("empty.title")}
          description={t("empty.subtitle")}
          action={
            canManage ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-glow)] hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("empty.cta")}
              </button>
            ) : undefined
          }
        />
      )}

      {canManage && (
        <LedgerFormDialog
          locale={locale}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          entry={editingEntry ?? seedEntry}
          categories={categories}
          clients={clients}
          projects={projects}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// URL serialisation
// ────────────────────────────────────────────────────────────

function serializeFilters(filters: LedgerFilterState): string {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("q", filters.search.trim());
  if (filters.kind !== "any") params.set("kind", filters.kind);
  if (filters.category !== "any") params.set("category", filters.category);
  if (filters.clientId !== "any") params.set("client", filters.clientId);
  if (filters.projectId !== "any") params.set("project", filters.projectId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.hideInvoiceSynced) params.set("manualOnly", "1");
  return params.toString();
}

function isFiltered(filters: LedgerFilterState): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.kind !== "any" ||
    filters.category !== "any" ||
    filters.clientId !== "any" ||
    filters.projectId !== "any" ||
    Boolean(filters.from) ||
    Boolean(filters.to) ||
    filters.hideInvoiceSynced
  );
}

/**
 * Map a reminder back to a partial entry shape so the form can open in
 * "log again" mode with the user's prior values. Server still treats it
 * as a new entry — we never reuse the reminder's id.
 */
function reminderToSeed(r: RecurringReminderRow): FinanceEntryRow {
  return {
    id: "",
    kind: "expense" as FinanceKind,
    category: r.category,
    occurredOn: new Date().toISOString(),
    description: r.description,
    amount: r.amount,
    currency: r.currency as Currency,
    amountUsd: r.amountUsd,
    exchangeRate: 1,
    rateDate: "",
    taxDeductible: false,
    taxCategory: null,
    recurring: {
      cadence: r.cadence as FinanceRecurringCadence,
      nextReminderAt: null,
    },
    receiptUrl: null,
    clientId: null,
    clientLabel: null,
    projectId: null,
    projectLabel: null,
    invoiceId: null,
    source: "manual",
    createdBy: null,
    createdAt: "",
    updatedAt: "",
  };
}
