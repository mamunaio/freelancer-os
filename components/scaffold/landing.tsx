"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, Languages, Moon, Sparkles, Sun } from "lucide-react";

import { useTheme } from "@/components/theme-provider";
import { Link, useRouter, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

interface LandingProps {
  locale: Locale;
  title: string;
  tagline: string;
  description: string;
}

/**
 * Public landing page for logged-out visitors. Lean — its job is to point
 * people at sign-in or sign-up. Logged-in users redirect to /dashboard
 * before this ever renders (handled in `[locale]/page.tsx`).
 */
export function ScaffoldLanding({
  locale,
  title,
  tagline,
  description,
}: LandingProps) {
  const tHeader = useTranslations("Header");
  const tAuth = useTranslations("Auth");
  const { mode, toggle } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const otherLocale: Locale = locale === "en" ? "bn" : "en";

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
        <div className="glass relative overflow-hidden rounded-2xl p-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-3 py-1">
            <Sparkles className="h-3 w-3 text-[hsl(var(--primary))]" />
            <span className="eyebrow text-[hsl(var(--foreground))]/80">
              Built for studios
            </span>
          </div>

          <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            {title}
          </h1>

          <p className="mt-3 text-lg font-medium text-[hsl(var(--foreground))]/90">
            {tagline}
          </p>

          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
            {description}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/auth/login"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-5 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-glow)] transition-opacity hover:opacity-90 focus-ring"
            >
              {tAuth("signIn")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] px-5 text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--surface-2))] focus-ring"
            >
              {tAuth("createAccount")}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
