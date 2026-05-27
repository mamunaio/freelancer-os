import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { requireOrgContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions/roles";
import { listLeads, getLeadStats } from "@/features/leads/queries";
import { listOrgMemberOptions } from "@/features/team/queries";
import { LeadsOrchestrator } from "@/components/leads/leads-orchestrator";
import { NewLeadButton } from "@/components/leads/new-lead-button";
import { PageHeader } from "@/components/layout/page-header";
import { Money } from "@/components/money/money";
import type { Locale } from "@/i18n/routing";

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function LeadsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgContext(locale);
  if (!can.manageLeads(ctx.role)) {
    redirect(`/${locale}/dashboard`);
  }

  const [leads, members, stats] = await Promise.all([
    listLeads(ctx.organizationId),
    listOrgMemberOptions(ctx.organizationId),
    getLeadStats(ctx.organizationId),
  ]);

  const t = await getTranslations({ locale, namespace: "Leads" });

  return (
    <div>
      <PageHeader
        eyebrow={t("title")}
        title={t("title")}
        subtitle={t("subtitle")}
        actions={<NewLeadButton locale={locale} members={members} />}
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <Pill label={t("stats.active")} value={stats.active.toString()} tint="info" />
            {stats.won > 0 && (
              <Pill
                label={t("stats.won")}
                value={stats.won.toString()}
                tint="success"
              />
            )}
            {stats.lost > 0 && (
              <Pill
                label={t("stats.lost")}
                value={stats.lost.toString()}
                tint="muted"
              />
            )}
            <span className="ml-1 inline-flex items-center gap-1 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] px-2 py-0.5 text-[hsl(var(--muted-foreground))]">
              {t("stats.pipelineValue")}{" "}
              <span className="font-medium text-[hsl(var(--foreground))]">
                <Money
                  amount={stats.activeValueUsd}
                  currency="USD"
                  compact
                  noTooltip
                />
              </span>
            </span>
            {stats.won + stats.lost > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] px-2 py-0.5 text-[hsl(var(--muted-foreground))]">
                {t("stats.conversionRate")}{" "}
                <span className="font-medium text-[hsl(var(--foreground))]">
                  {stats.conversionRate}%
                </span>
              </span>
            )}
          </div>
        }
      />

      <LeadsOrchestrator
        locale={locale}
        initialLeads={leads}
        members={members}
        canManage
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
  tint?: "default" | "success" | "info" | "muted";
}) {
  const tints = {
    default:
      "border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] text-[hsl(var(--foreground))]/80",
    success:
      "border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
    info: "border-[hsl(var(--info))]/30 bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]",
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
