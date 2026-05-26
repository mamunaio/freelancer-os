"use client";

import type { ReactNode } from "react";

import { AppShellProvider, type AppShellSession } from "./app-shell-context";
import { AppSidebar } from "./sidebar";
import { AppHeader } from "./header";
import { PageTransition } from "./page-transition";
import type { Locale } from "@/i18n/routing";

/**
 * Client wrapper that wires the shell context, the sidebar, and the header
 * around the page content. Server layout passes session info in via the
 * `session` prop so we never call back to the server from here.
 */
export function AppShell({
  children,
  session,
  locale,
}: {
  children: ReactNode;
  session: AppShellSession;
  locale: Locale;
}) {
  return (
    <AppShellProvider session={session}>
      <div className="relative flex min-h-screen w-full bg-[hsl(var(--background))]">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader locale={locale} />
          <main className="flex-1 overflow-x-hidden p-4 md:p-6 lg:p-8">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
    </AppShellProvider>
  );
}
