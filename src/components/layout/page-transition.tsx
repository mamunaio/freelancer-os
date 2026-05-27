"use client";

import type { ReactNode } from "react";

import { usePathname } from "@/i18n/navigation";

/**
 * Soft fade-up between pages.
 *
 * Uses a CSS keyframe (defined in globals.css as `fade-up`) instead of
 * framer-motion. CSS animations are deterministic between server-render and
 * client-hydration, while `useReducedMotion()` returns different values on
 * each side and was causing hydration drift that cascaded into Radix
 * `useId()` mismatches downstream.
 *
 * `motion-safe:` honours `prefers-reduced-motion` automatically — when the
 * user prefers reduced motion, the animation class is dropped entirely and
 * the page just renders in its final state.
 *
 * The `key` on the wrapping div forces a remount on pathname change so the
 * animation re-runs for each navigation.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className="motion-safe:animate-[fade-up_320ms_var(--ease-out-quint)_both]"
    >
      {children}
    </div>
  );
}
