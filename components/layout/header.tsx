"use client";

import { useTranslations } from "next-intl";
import { Bell, Command, Search, Sparkles } from "lucide-react";

import { LanguageToggle } from "./language-toggle";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { MobileSidebar } from "./mobile-sidebar";
import { useAppShell } from "./app-shell-context";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
}

/**
 * Sticky top bar.
 *
 * Contents (left → right):
 *  - mobile sidebar trigger (lg: hidden)
 *  - workspace breadcrumb
 *  - flexible spacer
 *  - search (⌘K placeholder)
 *  - copilot button (placeholder)
 *  - notifications (placeholder)
 *  - language toggle
 *  - theme toggle
 *  - user menu
 */
export function AppHeader({ locale }: Props) {
  const { session } = useAppShell();
  const tHeader = useTranslations("Header");

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/70 px-4 backdrop-blur-xl md:px-6">
      <MobileSidebar />

      <div className="hidden items-center gap-2 md:flex">
        <span className="text-[11px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
          {tHeader("workspace")}
        </span>
        <span className="text-xs text-[hsl(var(--muted-foreground))]/40">/</span>
        <span className="truncate text-xs font-medium text-[hsl(var(--foreground))]/90">
          {session.organizationName}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Search (placeholder — real CommandPalette in a later phase) */}
        <button
          type="button"
          disabled
          className="relative hidden h-9 w-72 cursor-not-allowed items-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] pl-9 pr-16 text-left text-xs text-[hsl(var(--muted-foreground))] opacity-70 md:flex"
          title="Coming in a later phase"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
          {tHeader("searchPlaceholder")}
          <span className="kbd pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
            <Command className="h-2.5 w-2.5" />K
          </span>
        </button>

        {/* Copilot (placeholder — AI lands later) */}
        <button
          type="button"
          disabled
          className="hidden h-9 cursor-not-allowed items-center gap-1.5 rounded-lg bg-[image:var(--gradient-primary)] px-3 text-xs font-medium text-[hsl(var(--primary-foreground))] opacity-70 shadow-[var(--shadow-glow)] sm:inline-flex"
          title="Coming in a later phase"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {tHeader("askCopilot")}
        </button>

        {/* Notifications (placeholder) */}
        <button
          type="button"
          disabled
          className="relative hidden h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] text-[hsl(var(--muted-foreground))] opacity-70 sm:inline-flex"
          title={tHeader("notifications")}
          aria-label={tHeader("notifications")}
        >
          <Bell className="h-4 w-4" />
        </button>

        <LanguageToggle locale={locale} />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
