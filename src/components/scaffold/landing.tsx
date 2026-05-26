"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "@/components/theme-provider";
import { useRouter, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { Moon, Sun, Languages, ArrowUpRight, Sparkles } from "lucide-react";

/**
 * Phase 0 landing card.
 *
 * Acts as a one-page smoke test for the foundation:
 *  - Tailwind v4 tokens render (surfaces, gradient, glass)
 *  - next-intl messages resolve in both en / bn
 *  - Theme toggle flips the .light / .dark class on <html>
 *  - Locale switcher swaps URL prefix without losing path state
 *  - Bengali font (Hind Siliguri) loads alongside Inter
 *
 * Will be replaced by the AppLayout shell + dashboard in Phase 1.
 */
interface LandingProps {
  locale: Locale;
  title: string;
  tagline: string;
  description: string;
}

export function ScaffoldLanding({
  locale,
  title,
  tagline,
  description,
}: LandingProps) {
  const tNav = useTranslations("Nav");
  const tHeader = useTranslations("Header");
  const { mode, toggle } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const otherLocale: Locale = locale === "en" ? "bn" : "en";

  const navItems = [
    "dashboard",
    "clients",
    "projects",
    "proposals",
    "tasks",
    "finance",
    "invoiceMaker",
    "focusTimer",
    "settings",
  ] as const;

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-16">
      {/* Top right controls */}
      <div className="absolute right-6 top-6 flex items-center gap-2">
        <button
          onClick={() =>
            router.replace(pathname, { locale: otherLocale, scroll: false })
          }
          className="focus-ring flex h-9 items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-3 text-xs font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
          title={otherLocale === "en" ? "Switch to English" : "বাংলায় দেখুন"}
        >
          <Languages className="h-3.5 w-3.5" />
          {otherLocale === "en" ? "EN" : "বাংলা"}
        </button>

        <button
          onClick={toggle}
          className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
          title={mode === "dark" ? tHeader("switchToLight") : tHeader("switchToDark")}
          aria-label={mode === "dark" ? tHeader("switchToLight") : tHeader("switchToDark")}
        >
          {mode === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="relative w-full max-w-2xl animate-[fade-up_480ms_var(--ease-out-quint)_both]">
        {/* Hero card */}
        <div className="glass relative overflow-hidden rounded-2xl p-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-3 py-1">
            <Sparkles className="h-3 w-3 text-[hsl(var(--primary))]" />
            <span className="eyebrow text-[hsl(var(--foreground))]/80">
              Phase 0 · Foundation
            </span>
          </div>

          <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            {title}
            <span className="gradient-text"> v2</span>
          </h1>

          <p className="mt-3 text-lg font-medium text-[hsl(var(--foreground))]/90">
            {tagline}
          </p>

          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
            {description}
          </p>

          {/* Status line */}
          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[hsl(var(--muted-foreground))]">
            <StatusPill label="Next.js 15" />
            <StatusPill label="React 19" />
            <StatusPill label="Tailwind v4" />
            <StatusPill label="next-intl" />
            <StatusPill label="MongoDB" />
          </div>
        </div>

        {/* Nav preview */}
        <div className="mt-8 grid grid-cols-3 gap-2 md:grid-cols-3">
          {navItems.map((key) => (
            <div
              key={key}
              className="group flex items-center justify-between rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] px-4 py-3 text-sm transition-all hover:border-[hsl(var(--primary))]/40 hover:bg-[hsl(var(--surface-2))]"
            >
              <span className="text-[hsl(var(--foreground))]/80">
                {tNav(key)}
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
          {locale === "bn"
            ? "ফাউন্ডেশন রেডি। পরবর্তী ফেজে অথ ও ড্যাশবোর্ড।"
            : "Foundation ready. Auth and dashboard land next."}
        </p>
      </div>
    </main>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-2 py-0.5 font-mono">
      <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" />
      {label}
    </span>
  );
}
