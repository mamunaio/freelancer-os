import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import {
  Briefcase,
  Calendar,
  ChevronLeft,
  Hash,
  Mail,
  Phone,
  Wallet,
} from "lucide-react";

import { requireOrgContext } from "@/lib/auth/session";
import { getClientById } from "@/features/clients/queries";
import { ClientStatusBadge } from "@/components/clients/client-status-badge";
import { ClientDetailHeader } from "@/components/clients/client-detail-header";
import { Money } from "@/components/money/money";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

interface PageProps {
  params: Promise<{ locale: Locale; id: string }>;
}

/**
 * Single-client detail page.
 *
 * Phase 7a renders the overview tab only — Projects, Money, Activity tabs
 * are placeholders that will light up as the corresponding modules ship.
 */
export default async function ClientDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgContext(locale);
  const client = await getClientById(ctx.organizationId, id);
  if (!client) notFound();

  const t = await getTranslations({ locale, namespace: "Clients" });
  const tDetail = await getTranslations({
    locale,
    namespace: "Clients.detail",
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/clients"
        className="inline-flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] focus-ring"
      >
        <ChevronLeft className="h-3 w-3" />
        {t("title")}
      </Link>

      {/* Header card */}
      <ClientDetailHeader locale={locale} client={client} />

      {/* Detail grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left column — contact + tags */}
        <aside className="space-y-4 lg:col-span-1">
          <Card>
            <SectionLabel>{tDetail("section.contact")}</SectionLabel>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Field icon={Mail} label={tDetail("field.email")}>
                {client.email ?? "—"}
              </Field>
              <Field icon={Phone} label={tDetail("field.phone")}>
                {client.phone ?? "—"}
              </Field>
              <Field icon={Hash} label={tDetail("field.portal")}>
                <code className="font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                  {client.portalToken.slice(0, 12)}…
                </code>
              </Field>
              <Field icon={Calendar} label={tDetail("field.createdAt")}>
                <FormattedDate value={client.createdAt} locale={locale} />
              </Field>
            </dl>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <SectionLabel>{tDetail("section.tags")}</SectionLabel>
              <ClientStatusBadge status={client.status} size="xs" />
            </div>
            {client.tags.length === 0 ? (
              <p className="mt-3 text-xs italic text-[hsl(var(--muted-foreground))]/60">
                —
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {client.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[11px] font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <SectionLabel>{t("stats.lifetimeRevenue")}</SectionLabel>
            <p className="mt-3 font-display text-2xl font-bold tabular-nums tracking-tight">
              <Money
                amount={client.totalRevenueUsd}
                currency="USD"
                compact
                noTooltip
              />
            </p>
          </Card>
        </aside>

        {/* Right column — notes + tab placeholders */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <SectionLabel>{tDetail("section.notes")}</SectionLabel>
            {client.notes ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[hsl(var(--foreground))]/90">
                {client.notes}
              </p>
            ) : (
              <p className="mt-3 text-sm italic text-[hsl(var(--muted-foreground))]/70">
                {tDetail("section.noNotes")}
              </p>
            )}
          </Card>

          {/* Projects placeholder */}
          <Card>
            <div className="flex items-center justify-between">
              <SectionLabel>{tDetail("tabs.projects")}</SectionLabel>
              <Briefcase className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]/60" />
            </div>
            <p className="mt-3 text-sm italic text-[hsl(var(--muted-foreground))]/70">
              {tDetail("noProjects")}
            </p>
          </Card>

          {/* Money placeholder */}
          <Card>
            <div className="flex items-center justify-between">
              <SectionLabel>{tDetail("tabs.money")}</SectionLabel>
              <Wallet className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]/60" />
            </div>
            <p className="mt-3 text-sm italic text-[hsl(var(--muted-foreground))]/70">
              {tDetail("noFinance")}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Local presentational pieces
// ────────────────────────────────────────────────────────────

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
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--surface-2))] text-[hsl(var(--muted-foreground))]">
        <Icon className="h-3 w-3" />
      </span>
      <div className="min-w-0">
        <dt className="text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]/70">
          {label}
        </dt>
        <dd className="truncate text-sm">{children}</dd>
      </div>
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
