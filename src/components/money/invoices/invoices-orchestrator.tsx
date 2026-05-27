"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import type { InvoiceRow } from "@/features/money/types";
import type { InvoiceStats } from "@/features/money/invoices/queries";
import { Button } from "@/components/ui/button";
import { InvoicesToolbar, type InvoiceFilterState } from "./invoices-toolbar";
import { InvoicesTable } from "./invoices-table";
import type { Locale } from "@/i18n/routing";

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
  initialInvoices: InvoiceRow[];
  stats: InvoiceStats;
  clients: ClientOption[];
  projects: ProjectOption[];
  canManage: boolean;
  initialFilters: InvoiceFilterState;
}

/**
 * Invoice list orchestrator.
 *
 * Manages filter state, URL sync, and renders the toolbar + table + stats.
 * The "New invoice" button routes to `/money/invoices/new` (standalone page).
 */
export function InvoicesOrchestrator({
  locale,
  initialInvoices,
  stats,
  clients,
  projects,
  canManage,
  initialFilters,
}: Props) {
  const t = useTranslations("Money.invoices");
  const router = useRouter();

  const [filters, setFilters] = useState<InvoiceFilterState>(initialFilters);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search.trim()) params.set("q", filters.search.trim());
    if (filters.status !== "any") params.set("status", filters.status);
    if (filters.clientId !== "any") params.set("client", filters.clientId);
    if (filters.projectId !== "any") params.set("project", filters.projectId);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);

    const newUrl = params.toString()
      ? `/${locale}/money/invoices?${params.toString()}`
      : `/${locale}/money/invoices`;

    if (newUrl !== window.location.pathname + window.location.search) {
      router.replace(newUrl, { scroll: false });
    }
  }, [filters, locale, router]);

  const isEmpty = initialInvoices.length === 0;
  const isFiltered =
    filters.search.trim().length > 0 ||
    filters.status !== "any" ||
    filters.clientId !== "any" ||
    filters.projectId !== "any" ||
    Boolean(filters.from) ||
    Boolean(filters.to);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatTile label={t("stats.total")} value={stats.total} />
        <StatTile label={t("stats.draft")} value={stats.draft} />
        <StatTile label={t("stats.sent")} value={stats.sent} />
        <StatTile label={t("stats.paid")} value={stats.paid} />
        <StatTile
          label={t("stats.overdue")}
          value={stats.overdue}
          variant="danger"
        />
        <StatTile
          label={t("stats.outstanding")}
          value={`$${stats.outstandingUsd.toLocaleString()}`}
          variant="primary"
        />
      </div>

      {/* Toolbar + New button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <InvoicesToolbar
            filters={filters}
            onFiltersChange={setFilters}
            clients={clients}
            projects={projects}
          />
        </div>
        {canManage && (
          <Button
            onClick={() => router.push(`/${locale}/money/invoices/new`)}
            className="shrink-0"
          >
            <Plus className="h-4 w-4" />
            {t("newInvoice")}
          </Button>
        )}
      </div>

      {/* Table or empty state */}
      {isEmpty && !isFiltered ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-8 text-center">
          <div className="mx-auto max-w-md space-y-3">
            <h3 className="text-lg font-semibold">{t("empty.title")}</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {t("empty.subtitle")}
            </p>
            {canManage && (
              <Button
                onClick={() => router.push(`/${locale}/money/invoices/new`)}
                className="mt-4"
              >
                <Plus className="h-4 w-4" />
                {t("empty.cta")}
              </Button>
            )}
          </div>
        </div>
      ) : isEmpty && isFiltered ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-8 text-center">
          <div className="mx-auto max-w-md space-y-3">
            <h3 className="text-lg font-semibold">{t("filtered.title")}</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {t("filtered.subtitle")}
            </p>
          </div>
        </div>
      ) : (
        <InvoicesTable
          locale={locale}
          invoices={initialInvoices}
          canManage={canManage}
        />
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string | number;
  variant?: "default" | "primary" | "danger";
}) {
  const colorClass =
    variant === "danger"
      ? "text-[hsl(var(--destructive))]"
      : variant === "primary"
        ? "text-[hsl(var(--primary))]"
        : "text-[hsl(var(--foreground))]";

  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
        {label}
      </p>
      <p className={`mt-2 font-display text-2xl font-semibold ${colorClass}`}>
        {value}
      </p>
    </div>
  );
}
