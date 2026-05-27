import { setRequestLocale } from "next-intl/server";

import { requireOrgContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions/roles";
import { listClientOptions } from "@/features/clients/client-options";
import { listProjectOptions } from "@/features/projects/project-options";
import {
  getLedgerStats,
  listFinanceEntries,
  listLedgerCategories,
  listRecurringReminders,
  type LedgerFilters,
} from "@/features/money/ledger/queries";
import { LedgerOrchestrator } from "@/components/money/ledger/ledger-orchestrator";
import type { LedgerFilterState } from "@/components/money/ledger/ledger-toolbar";
import { hasLocale, type Locale } from "@/i18n/routing";
import {
  FINANCE_KINDS,
  type FinanceKind,
} from "@/features/money/schemas";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Money → Ledger tab.
 *
 * Server resolves filters from URL params, runs the queries in parallel,
 * and seeds the orchestrator. Manager+ can read; Admin+ can write — write
 * affordances on the client side are gated by `canManage`.
 */
export default async function MoneyLedgerPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const safeLocale: Locale = hasLocale(locale) ? locale : "en";
  setRequestLocale(safeLocale);

  const ctx = await requireOrgContext(safeLocale);

  const sp = await searchParams;
  const filters = parseFilterParams(sp);
  const queryFilters = toQueryFilters(filters);

  const [entries, reminders, stats, categories, clients, projects] =
    await Promise.all([
      listFinanceEntries(ctx.organizationId, queryFilters),
      listRecurringReminders(ctx.organizationId),
      getLedgerStats(ctx.organizationId, queryFilters),
      listLedgerCategories(ctx.organizationId),
      listClientOptions(ctx.organizationId),
      listProjectOptions(ctx.organizationId, {
        visibleTo: ctx.session.userId,
        role: ctx.role,
        includeInactive: true,
      }),
    ]);

  const canManage = can.editFinance(ctx.role);

  return (
    <LedgerOrchestrator
      locale={safeLocale}
      initialEntries={entries}
      reminders={reminders}
      stats={stats}
      categories={categories}
      clients={clients}
      projects={projects}
      canManage={canManage}
      initialFilters={filters}
    />
  );
}

// ────────────────────────────────────────────────────────────
// URL → filter coercion
// ────────────────────────────────────────────────────────────

function readParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

function parseFilterParams(
  sp: Record<string, string | string[] | undefined>,
): LedgerFilterState {
  const kindRaw = readParam(sp, "kind");
  const kind: FinanceKind | "any" =
    kindRaw && (FINANCE_KINDS as readonly string[]).includes(kindRaw)
      ? (kindRaw as FinanceKind)
      : "any";

  return {
    search: readParam(sp, "q") ?? "",
    kind,
    category: readParam(sp, "category") ?? "any",
    clientId: readParam(sp, "client") ?? "any",
    projectId: readParam(sp, "project") ?? "any",
    from: readParam(sp, "from") ?? "",
    to: readParam(sp, "to") ?? "",
    hideInvoiceSynced: readParam(sp, "manualOnly") === "1",
  };
}

function toQueryFilters(state: LedgerFilterState): LedgerFilters {
  return {
    search: state.search.trim() || undefined,
    kind: state.kind === "any" ? "any" : (state.kind as FinanceKind),
    category: state.category === "any" ? "any" : state.category,
    clientId:
      state.clientId === "any"
        ? "any"
        : state.clientId === "none"
          ? "none"
          : state.clientId,
    projectId:
      state.projectId === "any"
        ? "any"
        : state.projectId === "none"
          ? "none"
          : state.projectId,
    from: state.from || null,
    to: state.to || null,
    hideInvoiceSynced: state.hideInvoiceSynced,
  };
}

export const dynamic = "force-dynamic";
