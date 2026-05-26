"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * Theme provider with three-state preference: dark / light / system.
 *
 * - The *preference* is what the user picked.
 * - The *resolved* mode is what's actually applied to the root.
 * - When `preference === "system"`, we follow `prefers-color-scheme` and
 *   live-update if the OS theme changes.
 *
 * Persisted in localStorage so the choice survives reload before the user's
 * server-side preference loads (which then takes over on hydration).
 */

export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

interface ThemeContextValue {
  preference: ThemePreference;
  mode: ResolvedTheme;
  setPreference: (p: ThemePreference) => void;
  /** Convenience for header toggle — flips between light/dark, "system" → opposite of resolved. */
  toggle: () => void;
}

const STORAGE_KEY = "injaazh-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function detectSystem(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function ThemeProvider({
  children,
  initialPreference,
}: {
  children: ReactNode;
  /**
   * Optional server-side preference — passed in from the layout when the
   * user is signed in, so the very first render matches their saved choice.
   */
  initialPreference?: ThemePreference;
}) {
  const [preference, setPreferenceState] = useState<ThemePreference>(
    initialPreference ?? "dark",
  );
  const [mode, setMode] = useState<ResolvedTheme>("dark");

  // Hydrate from localStorage if no server-side preference was given.
  useEffect(() => {
    if (initialPreference) return;
    const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
    if (stored === "dark" || stored === "light" || stored === "system") {
      setPreferenceState(stored);
    } else {
      setPreferenceState("system");
    }
  }, [initialPreference]);

  // Resolve preference → mode and apply to document root.
  useEffect(() => {
    const apply = (next: ResolvedTheme) => {
      const html = document.documentElement;
      html.classList.toggle("light", next === "light");
      html.classList.toggle("dark", next === "dark");
      setMode(next);
    };

    if (preference === "system") {
      apply(detectSystem());
      const mq = window.matchMedia("(prefers-color-scheme: light)");
      const onChange = () => apply(detectSystem());
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    apply(preference);
  }, [preference]);

  // Persist preference to localStorage.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, preference);
  }, [preference]);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
  }, []);

  const toggle = useCallback(() => {
    setPreferenceState((prev) => {
      const current: ResolvedTheme =
        prev === "system" ? detectSystem() : prev;
      return current === "dark" ? "light" : "dark";
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, mode, setPreference, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return ctx;
}
