"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { usePathname } from "@/i18n/navigation";

/**
 * Soft fade-up between pages.
 *
 * The motion wrapper is always rendered so the server and client agree on
 * the DOM tree (avoids hydration mismatches caused by `useReducedMotion()`
 * returning `null` server-side and a boolean after mount). When reduced
 * motion is preferred, we just skip the entrance animation by passing
 * `initial={false}` and zeroing the duration.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <motion.div
      key={pathname}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduce ? 0 : 0.32,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
