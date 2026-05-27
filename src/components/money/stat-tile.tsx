import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface Props {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  hint?: string;
  /** Compact variant — used in Overview's KPI grid. */
  variant?: "default" | "tinted";
  tint?: "primary" | "success" | "warning" | "danger" | "muted";
  className?: string;
}

const TINT_BG: Record<NonNullable<Props["tint"]>, string> = {
  primary: "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]",
  success: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  warning: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
  danger: "bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]",
  muted:
    "bg-[hsl(var(--surface-2))] text-[hsl(var(--muted-foreground))]",
};

/**
 * Reusable KPI tile for the Money module. Same shape as the dashboard's
 * stat tiles but lives under `components/money` so subsequent sub-phases
 * can extend it without touching dashboard code.
 */
export function StatTile({
  icon: Icon,
  label,
  value,
  delta,
  hint,
  variant = "default",
  tint = "muted",
  className,
}: Props) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
          {label}
        </p>
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md",
            variant === "tinted"
              ? TINT_BG[tint]
              : "bg-[hsl(var(--surface-2))] text-[hsl(var(--muted-foreground))]",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-bold tabular-nums tracking-tight">
        {value}
      </p>
      {delta && (
        <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
          {delta}
        </p>
      )}
      {hint && (
        <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
          {hint}
        </p>
      )}
    </div>
  );
}
