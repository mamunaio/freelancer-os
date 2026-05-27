import { setRequestLocale } from "next-intl/server";

import { requireOrgContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions/roles";
import { listClientOptions } from "@/features/clients/client-options";
import { listProjectOptions } from "@/features/projects/project-options";
import {
  getInvoiceStats,
  listInvoices,
  type InvoiceFilters,
} from "@/features/money/invoices/queries";
import { InvoicesOrchestrator } from "@/components/money/invoices/invoices-orchestrator";
import type { InvoiceFilterState } from "@/components/money/invoices/invoices-toolbar";
import { hasLocale, type Locale } from "@/i18n/routing";
import {
  INVOICE_STATUSES,
  type InvoiceStatus,
} from "@/features/money/schemas";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Money → Invoices tab.
 *
 * Server resolves filters from URL params, runs the queries in parallel,
 * and seeds the orchestrator. Manager+ can read; Admin+ can write.
 */
export default async function MoneyInvoicesPage({
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

  const [invoices, stats, clients, projects] = await Promise.all([
    listInvoices(ctx.organizationId, queryFilters),
    getInvoiceStats(ctx.organizationId),
    listClientOptions(ctx.organizationId),
    listProjectOptions(ctx.organizationId, {
      visibleTo: ctx.session.userId,
      role: ctx.role,
      includeInactive: true,
    }),
  ]);

  const canManage = can.editFinance(ctx.role);

  return (
    <InvoicesOrchestrator
      locale={safeLocale}
      initialInvoices={invoices}
      stats={stats}
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
): InvoiceFilterState {
  const statusRaw = readParam(sp, "status");
  const status: InvoiceStatus | "any" | "overdue" =
    statusRaw &&
    ([...INVOICE_STATUSES, "overdue"] as readonly string[]).includes(statusRaw)
      ? (statusRaw as InvoiceStatus | "overdue")
      : "any";

  return {
    search: readParam(sp, "q") ?? "",
    status,
    clientId: readParam(sp, "client") ?? "any",
    projectId: readParam(sp, "project") ?? "any",
    from: readParam(sp, "from") ?? "",
    to: readParam(sp, "to") ?? "",
  };
}

function toQueryFilters(state: InvoiceFilterState): InvoiceFilters {
  return {
    search: state.search.trim() || undefined,
    status: state.status === "any" ? "any" : state.status,
    clientId: state.clientId === "any" ? "any" : state.clientId,
    projectId:
      state.projectId === "any"
        ? "any"
        : state.projectId === "none"
          ? "none"
          : state.projectId,
    from: state.from || null,
    to: state.to || null,
  };
}

export const dynamic = "force-dynamic";
