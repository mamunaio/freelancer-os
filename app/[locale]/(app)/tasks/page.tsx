import { setRequestLocale, getTranslations } from "next-intl/server";

import { requireOrgContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions/roles";
import { listTasksForRole, getTaskStats } from "@/features/tasks/queries";
import { listProjectOptions } from "@/features/projects/project-options";
import { listOrgMemberOptions } from "@/features/team/queries";
import { TasksOrchestrator } from "@/components/tasks/tasks-orchestrator";
import { NewTaskButton } from "@/components/tasks/new-task-button";
import { PageHeader } from "@/components/layout/page-header";
import type { Locale } from "@/i18n/routing";

interface PageProps {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{ action?: string }>;
}

export default async function TasksPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgContext(locale);
  const t = await getTranslations({ locale, namespace: "Tasks" });

  const visibleTo = can.viewAllProjects(ctx.role) ? undefined : ctx.session.userId;
  const resolvedSearchParams = await searchParams;
  const defaultOpen = resolvedSearchParams?.action === "new";

  const [tasks, projects, members, stats] = await Promise.all([
    listTasksForRole(ctx.organizationId, ctx.session.userId, ctx.role, {
      done: "any",
    }),
    listProjectOptions(ctx.organizationId, {
      visibleTo: ctx.session.userId,
      role: ctx.role,
    }),
    listOrgMemberOptions(ctx.organizationId),
    getTaskStats(ctx.organizationId, { visibleTo }),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow={t("title")}
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <NewTaskButton locale={locale} projects={projects} members={members} defaultOpen={defaultOpen} />
        }
        meta={
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <Pill label={t("stats.open")} value={stats.open.toString()} tint="primary" />
            {stats.overdue > 0 && (
              <Pill
                label={t("stats.overdue")}
                value={stats.overdue.toString()}
                tint="danger"
              />
            )}
            {stats.done > 0 && (
              <Pill
                label={t("stats.done")}
                value={stats.done.toString()}
                tint="success"
              />
            )}
            {stats.totalEstimateMinutes > 0 && (
              <Pill
                label={t("stats.estimateTotal")}
                value={`${Math.round(stats.totalEstimateMinutes / 60)}h ${stats.totalEstimateMinutes % 60}m`}
                tint="default"
              />
            )}
          </div>
        }
      />

      <TasksOrchestrator
        locale={locale}
        initialTasks={tasks}
        projects={projects}
        members={members}
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
  tint?: "default" | "success" | "primary" | "danger";
}) {
  const tints = {
    default:
      "border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] text-[hsl(var(--foreground))]/80",
    success:
      "border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
    primary:
      "border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]",
    danger:
      "border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]",
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
