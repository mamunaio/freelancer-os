import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  /** Use when the empty state is filtered (no results) — softer styling. */
  variant?: "blank" | "filtered";
}

/**
 * Reusable empty-state card. Two flavours:
 *  - blank: brand-tinted, encourages first action.
 *  - filtered: neutral, encourages clearing filters.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "blank",
}: Props) {
  return (
    <div
      className={
        variant === "blank"
          ? "flex flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border-strong))] bg-[hsl(var(--surface-1))] px-6 py-14 text-center"
          : "flex flex-col items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] px-6 py-10 text-center"
      }
    >
      <span
        className={
          variant === "blank"
            ? "flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
            : "flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--surface-2))] text-[hsl(var(--muted-foreground))]"
        }
      >
        <Icon className={variant === "blank" ? "h-5 w-5" : "h-4 w-4"} />
      </span>
      <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">
        {title}
      </h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
