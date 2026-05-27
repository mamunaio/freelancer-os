import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Calendar, ChevronLeft, Users } from "lucide-react";

import {
  getProjectById,
  getProjectMilestones,
  isProjectMember,
} from "@/features/projects/queries";
import { listClientOptions } from "@/features/clients/client-options";
import { listOrgMemberOptions } from "@/features/team/queries";
import { requireOrgContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions/roles";
import { Money } from "@/components/money/money";
import { Link } from "@/i18n/navigation";
import { ProjectStatusBadge } from "@/components/projects/status-badge";
import { ProjectDetailTabs } from "@/components/projects/project-detail-tabs";
import { ProjectDetailHeader } from "@/components/projects/project-detail-header";
import type { Locale } from "@/i18n/routing";

interface PageProps {
  params: Promise<{ locale: Locale; id: string }>;
}

/**
 * Project detail page — visible to:
 *  - Manager+ across the org, or
 *  - any user listed in `ProjectMember` for this project.
 */
export default async function ProjectDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgContext(locale);
  const project = await getProjectById(ctx.organizationId, id);
  if (!project) notFound();

  const allowed =
    can.viewAllProjects(ctx.role) ||
    (await isProjectMember(id, ctx.session.userId));
  if (!allowed) {
    redirect(`/${locale}/projects`);
  }

  const [milestones, clients, members] = await Promise.all([
    getProjectMilestones(ctx.organizationId, id),
    listClientOptions(ctx.organizationId),
    listOrgMemberOptions(ctx.organizationId),
  ]);

  const t = await getTranslations({ locale, namespace: "Projects" });
  const tDetail = await getTranslations({
    locale,
    namespace: "Projects.detail",
  });

  const canManage = can.createProjects(ctx.role);
  const budgetUsd = project.budgetAmountUsd;
  const billedPct =
    budgetUsd > 0
      ? Math.min(100, Math.round((project.billedAmountUsd / budgetUsd) * 100))
      : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] focus-ring"
      >
        <ChevronLeft className="h-3 w-3" />
        {t("title")}
      </Link>

      <ProjectDetailHeader
        locale={locale}
        project={project}
        clients={clients}
        members={members}
        canManage={canManage}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <aside className="space-y-4 lg:col-span-1">
          <Card>
            <SectionLabel>{tDetail("section.details")}</SectionLabel>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Field label={tDetail("field.client")}>
                {project.client ? (
                  <Link
                    href={`/clients/${project.client.id}`}
                    className="hover:text-[hsl(var(--primary))] hover:underline"
                  >
                    {project.client.company ?? project.client.name}
                  </Link>
                ) : (
                  "—"
                )}
              </Field>
              <Field label={tDetail("field.status")}>
                <ProjectStatusBadge status={project.status} size="xs" />
              </Field>
              <Field label={tDetail("field.started")}>
                {project.startedAt ? (
                  <FormattedDate value={project.startedAt} locale={locale} />
                ) : (
                  "—"
                )}
              </Field>
              <Field label={tDetail("field.due")}>
                {project.dueAt ? (
                  <FormattedDate value={project.dueAt} locale={locale} />
                ) : (
                  "—"
                )}
              </Field>
              {project.completedAt && (
                <Field label={tDetail("field.completed")}>
                  <FormattedDate
                    value={project.completedAt}
                    locale={locale}
                  />
                </Field>
              )}
            </dl>
          </Card>

          {project.budgetAmount > 0 && (
            <Card>
              <SectionLabel>{tDetail("section.budget")}</SectionLabel>
              <p className="mt-3 font-display text-2xl font-bold tabular-nums tracking-tight">
                <Money
                  amount={project.budgetAmount}
                  currency={project.budgetCurrency}
                  amountUsd={project.budgetAmountUsd}
                  rateDate={project.budgetRateDate ?? undefined}
                />
              </p>
              {project.billedAmountUsd > 0 && (
                <>
                  <p className="mt-1 text-[11px] tabular-nums text-[hsl(var(--muted-foreground))]">
                    {t("card.billedOf", {
                      billed: "",
                      budget: "",
                    }).replace(/\s+of\s+|\s+এর\s+মধ্যে\s+/, " · ")}
                    <Money
                      amount={project.billedAmountUsd}
                      currency="USD"
                      compact
                      noTooltip
                    />{" "}
                    billed · {billedPct}%
                  </p>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[hsl(var(--surface-2))]">
                    <div
                      className="h-full rounded-full bg-[image:var(--gradient-primary)]"
                      style={{ width: `${billedPct}%` }}
                    />
                  </div>
                </>
              )}
            </Card>
          )}

          <Card>
            <div className="flex items-center justify-between">
              <SectionLabel>{tDetail("section.team")}</SectionLabel>
              <Users className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]/60" />
            </div>
            {project.members.length === 0 ? (
              <p className="mt-3 text-xs italic text-[hsl(var(--muted-foreground))]/60">
                —
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {project.members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm">
                      {m.name}
                    </span>
                    <span className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      {m.role}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {project.techStack.length > 0 && (
            <Card>
              <SectionLabel>{tDetail("field.techStack")}</SectionLabel>
              <div className="mt-3 flex flex-wrap gap-1">
                {project.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[11px] font-medium"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </Card>
          )}
        </aside>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <SectionLabel>{tDetail("section.description")}</SectionLabel>
            {project.description ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[hsl(var(--foreground))]/90">
                {project.description}
              </p>
            ) : (
              <p className="mt-3 text-sm italic text-[hsl(var(--muted-foreground))]/70">
                {tDetail("section.noDescription")}
              </p>
            )}
          </Card>

          <ProjectDetailTabs
            locale={locale}
            projectId={project.id}
            milestones={milestones}
            canManage={canManage}
          />
        </div>
      </div>

      <Calendar className="hidden" aria-hidden="true" />
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-4">
      {children}
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]/70">
        {label}
      </dt>
      <dd className="truncate text-sm">{children}</dd>
    </div>
  );
}

function FormattedDate({
  value,
  locale,
}: {
  value: string;
  locale: Locale;
}) {
  const fmt = new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return <span>{fmt.format(new Date(value))}</span>;
}

export const dynamic = "force-dynamic";
