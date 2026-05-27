import { setRequestLocale, getTranslations } from "next-intl/server";

import { requireOrgContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions/roles";
import {
  getClientStats,
  listClientTags,
  listClients,
} from "@/features/clients/queries";
import { ClientsList } from "@/components/clients/clients-list";
import { NewClientButton } from "@/components/clients/new-client-button";
import { PageHeader } from "@/components/layout/page-header";
import { Money } from "@/components/money/money";
import type { Locale } from "@/i18n/routing";

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

/**
 * Clients module landing page.
 *
 * Visible to Manager+. Members would have the nav item hidden but the page
 * still renders for them with whatever clients they're project-linked to —
 * which we'll wire when projects ship in 7c.
 */
export default async function ClientsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgContext(locale);
  const t = await getTranslations({ locale, namespace: "Clients" });

  const [clients, tags, stats] = await Promise.all([
    listClients(ctx.organizationId, { sort: "recent" }),
    listClientTags(ctx.organizationId),
    getClientStats(ctx.organizationId),
  ]);

  const canManage = can.manageClients(ctx.role);

  return (
    <div>
      <PageHeader
        eyebrow={t("title")}
        title={t("title")}
        subtitle={t("subtitle")}
        actions={canManage ? <NewClientButton locale={locale} /> : null}
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <Pill label={t("stats.total")} value={stats.total.toString()} />
            <Pill
              label={t("stats.active")}
              value={stats.active.toString()}
              tint="success"
            />
            {stats.paused > 0 && (
              <Pill
                label={t("stats.paused")}
                value={stats.paused.toString()}
                tint="warning"
              />
            )}
            {stats.archived > 0 && (
              <Pill
                label={t("stats.archived")}
                value={stats.archived.toString()}
                tint="muted"
              />
            )}
            <span className="ml-1 inline-flex items-center gap-1 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] px-2 py-0.5 text-[hsl(var(--muted-foreground))]">
              {t("stats.lifetimeRevenue")}{" "}
              <span className="font-medium text-[hsl(var(--foreground))]">
                <Money
                  amount={stats.totalRevenueUsd}
                  currency="USD"
                  compact
                  noTooltip
                />
              </span>
            </span>
          </div>
        }
      />

      <ClientsList
        locale={locale}
        initialClients={clients}
        tags={tags}
        canManage={canManage}
      />
    </div>
  );
}

function Pill({
  label,
  value,
  tint = "default",
}: {
  label: string;
  value: string;
  tint?: "default" | "success" | "warning" | "muted";
}) {
  const tints = {
    default:
      "border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] text-[hsl(var(--foreground))]/80",
    success:
      "border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
    warning:
      "border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
    muted:
      "border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] text-[hsl(var(--muted-foreground))]",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 ${tints[tint]}`}
    >
      <span className="text-[10px] uppercase tracking-[0.16em] opacity-70">
        {label}
      </span>
      <span className="text-xs font-semibold tabular-nums">{value}</span>
    </span>
  );
}

export const dynamic = "force-dynamic";
