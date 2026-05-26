"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { OrgRole } from "@/lib/db/models/org-member";

/**
 * App shell client context.
 *
 * Carries the parts of the active session a client component needs (role,
 * org name, user info) plus shell-state (sidebar collapsed, etc).
 *
 * The server layout is the source of truth for role + org info — the context
 * just passes those values down so client children don't have to refetch.
 */

export interface AppShellSession {
  userId: string;
  email: string;
  name: string | null;
  image: string | null;
  role: OrgRole;
  organizationId: string;
  organizationName: string;
}

interface ShellContextValue {
  session: AppShellSession;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

const STORAGE_KEY = "injaazh-sidebar-collapsed";

export function AppShellProvider({
  children,
  session,
}: {
  children: ReactNode;
  session: AppShellSession;
}) {
  // Default expanded; localStorage may flip it after hydration.
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "1") setSidebarCollapsedState(true);
  }, []);

  const setSidebarCollapsed = useCallback((v: boolean) => {
    setSidebarCollapsedState(v);
    localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsedState((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  return (
    <ShellContext.Provider
      value={{
        session,
        sidebarCollapsed,
        toggleSidebar,
        setSidebarCollapsed,
      }}
    >
      {children}
    </ShellContext.Provider>
  );
}

export function useAppShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) {
    throw new Error("useAppShell must be used within AppShellProvider");
  }
  return ctx;
}
