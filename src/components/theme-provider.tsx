"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type ThemeMode = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const STORAGE_KEY = "injaazh-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Theme provider with localStorage persistence.
 *
 * Defaults to dark to match the brand canvas. The active class is applied to
 * <html>, so Tailwind's `dark:` and our `.light` class both work.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");

  // Hydrate from localStorage / system preference once on mount.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    const systemPrefersLight = window.matchMedia(
      "(prefers-color-scheme: light)",
    ).matches;
    const initial: ThemeMode =
      stored ?? (systemPrefersLight ? "light" : "dark");
    setModeState(initial);
  }, []);

  // Apply class + persist whenever mode changes.
  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("light", mode === "light");
    html.classList.toggle("dark", mode === "dark");
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => setModeState(next), []);
  const toggle = useCallback(
    () => setModeState((m) => (m === "dark" ? "light" : "dark")),
    [],
  );

  return (
    <ThemeContext.Provider value={{ mode, setMode, toggle }}>
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
