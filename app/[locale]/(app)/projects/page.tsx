import { setRequestLocale, getTranslations } from "next-intl/server";
import { Briefcase } from "lucide-react";

import { requireOrgContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions/roles";
import { listProjectsForRole, getProjectStats } from "@/features/projects/queries";
import { listClientOptions } from "@/features/clients/client-options";
import { listOrgMemberOptions } from "@/features/team/queries";
import { ProjectsOrchestrator } from "@/components/projects/projects-orchestrator";
import { NewProjectButton } from "@/components/projects/new-project-button";
import { PageHeader } from "@/components/layout/page-header";
import { Money } from "@/components/money/money";
import { EmptyState } from "@/components/layout/empty-state";
import type { Locale } from "@/i18n/routing";

interface PageProps {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{ action?: string }>;
}

export default async function ProjectsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgContext(locale);
  const t = await getTranslations({ locale, namespace: "Projects" });

  const resolvedSearchParams = await searchParams;
  const defaultOpen = resolvedSearchParams?.action === "new";

  const [projects, clients, members, stats] = await Promise.all([
    listProjectsForRole(ctx.organizationId, ctx.session.userId, ctx.role),
    listClientOptions(ctx.organizationId),
    listOrgMemberOptions(ctx.organizationId),
    getProjectStats(ctx.organizationId, {
      visibleTo: can.viewAllProjects(ctx.role)
        ? undefined
        : ctx.session.userId,
    }),
  ]);

  const canManage = can.createProjects(ctx.role);

  return (
    <div>
      <PageHeader
        eyebrow={t("title")}
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          canManage ? (
            <NewProjectButton
              locale={locale}
              clients={clients}
              members={members}
              defaultOpen={defaultOpen}
            />
          ) : null
        }
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <Pill label={t("stats.active")} value={stats.active.toString()} tint="primary" />
            {stats.completed > 0 && (
              <Pill
                label={t("stats.completed")}
                value={stats.completed.toString()}
                tint="success"
              />
            )}
            {stats.onHold > 0 && (
              <Pill
                label={t("stats.onHold")}
                value={stats.onHold.toString()}
                tint="warning"
              />
            )}
            {stats.activeBudgetUsd > 0 && (
              <span className="ml-1 inline-flex items-center gap-1 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] px-2 py-0.5 text-[hsl(var(--muted-foreground))]">
                {t("stats.budget")}{" "}
                <span className="font-medium text-[hsl(var(--foreground))]">
                  <Money
                    amount={stats.activeBudgetUsd}
                    currency="USD"
                    compact
                    noTooltip
                  />
                </span>
              </span>
            )}
            {stats.activeBilledUsd > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] px-2 py-0.5 text-[hsl(var(--muted-foreground))]">
                {t("stats.billed")}{" "}
                <span className="font-medium text-[hsl(var(--foreground))]">
                  <Money
                    amount={stats.activeBilledUsd}
                    currency="USD"
                    compact
                    noTooltip
                  />
                </span>
              </span>
            )}
          </div>
        }
      />

      {clients.length === 0 && projects.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Add a client first"
          description="Projects are tied to clients. Create your first client and you'll be able to start a project against them."
        />
      ) : (
        <ProjectsOrchestrator
          locale={locale}
          initialProjects={projects}
          clients={clients}
          members={members}
          canManage={canManage}
        />
      )}
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
  tint?: "default" | "success" | "primary" | "warning";
}) {
  const tints = {
    default:
      "border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] text-[hsl(var(--foreground))]/80",
    success:
      "border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
    primary:
      "border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]",
    warning:
      "border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
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
