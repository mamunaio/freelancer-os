import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Construction, Sparkles } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

interface StubPageProps {
  /** Module title (already translated). */
  title: string;
  /** Eyebrow label — usually the nav group name. */
  eyebrow: string;
  /** Icon for the hero badge. */
  icon: LucideIcon;
  /** Phase number when this module is scheduled to ship. */
  phase: string;
  /** Locale, used for back-to-dashboard link. */
  locale: string;
}

/**
 * Shared "Coming soon" page for routes whose feature hasn't shipped yet.
 *
 * Renders inside the AppShell so the user can still see the sidebar +
 * header. The page itself communicates that the route is queued and links
 * back to the dashboard.
 */
export async function StubPage({
  title,
  eyebrow,
  icon: Icon,
  phase,
  locale,
}: StubPageProps) {
  const t = await getTranslations({ locale, namespace: "Stub" });

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-6 py-8">
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))] focus-ring"
      >
        <ArrowLeft className="h-3 w-3" />
        {t("backToDashboard")}
      </Link>

      <div className="glass relative w-full overflow-hidden rounded-2xl p-8">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--surface-2))] border border-[hsl(var(--border))]">
            <Icon className="h-5 w-5 text-[hsl(var(--primary))]" />
          </span>
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">
              {title}
            </h1>
          </div>
        </div>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-3 py-1">
          <Construction className="h-3 w-3 text-[hsl(var(--warning))]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--foreground))]/80">
            {t("comingSoon")} · {phase}
          </span>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
          {t("description")}
        </p>

        <div className="mt-6 flex items-center gap-3">
          <a
            href="https://github.com/mamunaio/freelancer-os/blob/main/ARCHITECTURE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[hsl(var(--surface-2))]"
          >
            <Sparkles className="h-3 w-3 text-[hsl(var(--primary))]" />
            {t("viewRoadmap")}
          </a>
        </div>
      </div>
    </div>
  );
}
