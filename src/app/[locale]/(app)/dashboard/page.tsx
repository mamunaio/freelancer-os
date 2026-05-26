import { setRequestLocale } from "next-intl/server";
import { Briefcase, ArrowRight } from "lucide-react";

import { requireOrgContext } from "@/lib/auth/session";
import type { Locale } from "@/i18n/routing";

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

/**
 * Phase 2 dashboard placeholder.
 *
 * Authenticated landing surface — proves the auth + org-context flow end to
 * end. Replaced by the Studio Briefing dashboard in a later phase.
 */
export default async function DashboardPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgContext(locale);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="eyebrow">Phase 2 · Auth wired</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
        You&apos;re in,{" "}
        <span className="gradient-text">{ctx.session.name ?? "Founder"}</span>
        .
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[hsl(var(--muted-foreground))]">
        Auth, organization, and role context are live. The Studio Briefing
        dashboard lands once the app shell, currency layer, and core modules
        are wired.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Tile label="Active organization" value={ctx.organizationId} muted />
        <Tile label="Your role" value={ctx.role} muted />
        <Tile label="User id" value={ctx.session.userId} muted />
        <Tile label="Locale · Theme" value={`${ctx.session.locale} · ${ctx.session.themeMode}`} muted />
      </div>

      <div className="glass mt-8 flex items-center justify-between rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
            <Briefcase className="h-4 w-4 text-[hsl(var(--primary-foreground))]" />
          </span>
          <div>
            <p className="text-sm font-medium">Up next</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              App shell · sidebar · settings · members
            </p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
      </div>
    </div>
  );
}

function Tile({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-4">
      <p className="eyebrow">{label}</p>
      <p
        className={
          muted
            ? "mt-2 break-all font-mono text-xs text-[hsl(var(--muted-foreground))]"
            : "mt-2 break-all text-sm"
        }
      >
        {value}
      </p>
    </div>
  );
}


// Force dynamic rendering — this page reads the auth session at request time
// and must never be statically prerendered (which would also try to open a
// DB connection during build).
export const dynamic = "force-dynamic";
