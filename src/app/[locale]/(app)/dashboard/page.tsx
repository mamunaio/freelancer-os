import { setRequestLocale } from "next-intl/server";
import { Briefcase, ArrowRight } from "lucide-react";

import { requireOrgContext } from "@/lib/auth/session";
import type { Locale } from "@/i18n/routing";

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

/**
 * Phase 3 dashboard placeholder — same content as Phase 2 but now rendered
 * inside the AppShell. The Studio Briefing dashboard ships in Phase 6.
 */
export default async function DashboardPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgContext(locale);

  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow">Phase 3 · App shell wired</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
        You&apos;re in,{" "}
        <span className="gradient-text">{ctx.session.name ?? "Founder"}</span>
        .
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[hsl(var(--muted-foreground))]">
        Sidebar, header, locale + theme switching, and role-aware navigation
        are live. The Studio Briefing dashboard, modules, currency layer, and
        AI surfaces ship in upcoming phases.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Tile label="Active organization" value={ctx.organizationId} />
        <Tile label="Your role" value={ctx.role} />
        <Tile label="User id" value={ctx.session.userId} />
        <Tile
          label="Locale · theme"
          value={`${ctx.session.locale} · ${ctx.session.themeMode}`}
        />
      </div>

      <div className="glass mt-8 flex items-center justify-between rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
            <Briefcase className="h-4 w-4 text-[hsl(var(--primary-foreground))]" />
          </span>
          <div>
            <p className="text-sm font-medium">Up next</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Settings · members · customize-dashboard · then currency &amp;
              briefing
            </p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 break-all font-mono text-xs text-[hsl(var(--muted-foreground))]">
        {value}
      </p>
    </div>
  );
}

export const dynamic = "force-dynamic";
