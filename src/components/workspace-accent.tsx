"use client";

import { useEffect, type ReactNode } from "react";
import { deriveGlow, parseHsl, formatHsl } from "@/lib/color/hsl";

/**
 * Applies the workspace accent HSL to CSS variables at runtime.
 *
 * The server passes the accent string via prop (already validated). This
 * client component patches the document root so the change is visible
 * everywhere — sidebar gradient, primary buttons, focus rings, glass overlay.
 *
 * Re-runs whenever `accentHsl` changes (e.g., after a settings save).
 */
export function WorkspaceAccent({
  accentHsl,
  children,
}: {
  accentHsl: string | null;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!accentHsl) return;
    const parsed = parseHsl(accentHsl);
    if (!parsed) return;

    const glow = deriveGlow(parsed);
    const root = document.documentElement;
    const accent = formatHsl(parsed);
    const glowStr = formatHsl(glow);

    root.style.setProperty("--primary", accent);
    root.style.setProperty("--ring", accent);
    root.style.setProperty("--sidebar-primary", accent);
    root.style.setProperty("--sidebar-ring", accent);
    root.style.setProperty("--primary-glow", glowStr);
    root.style.setProperty(
      "--gradient-primary",
      `linear-gradient(135deg, hsl(${accent}) 0%, hsl(${glowStr}) 100%)`,
    );
    root.style.setProperty(
      "--shadow-glow",
      `0 8px 32px -8px hsl(${accent} / 0.4)`,
    );

    return () => {
      // No cleanup — leaving custom properties is harmless and avoids a flash
      // when navigating between pages that share this provider.
    };
  }, [accentHsl]);

  return <>{children}</>;
}
