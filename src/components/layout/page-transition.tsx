"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { usePathname } from "@/i18n/navigation";

/**
 * Soft fade-up between pages. Respects `prefers-reduced-motion`.
 *
 * The transition keys on `pathname` so navigations re-trigger the animation
 * without remounting children.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  if (reduce) return <>{children}</>;

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
