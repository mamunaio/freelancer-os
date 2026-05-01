import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function GlassCard({
  children,
  className,
  hover = false,
  gradient = false,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
  onClick?: () => void;
}) {
  const classes = cn(
    "glass rounded-2xl p-5",
    hover && "glass-hover cursor-pointer",
    gradient && "gradient-border",
    className,
  );

  if (hover || onClick) {
    return (
      <motion.div
        className={classes}
        onClick={onClick}
        whileHover={{ scale: 1.02 }}
        whileTap={onClick ? { scale: 0.99 } : undefined}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={classes}>{children}</div>;
}
