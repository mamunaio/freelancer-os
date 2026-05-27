import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { InvoiceDisplayStatus } from "@/features/money/schemas";

interface Props {
  status: InvoiceDisplayStatus;
  className?: string;
}

/**
 * Invoice status badge.
 *
 * "overdue" is computed at render time from `dueDate` + `status` ∈ {sent, viewed}.
 * Never persisted — the badge logic lives here.
 */
export function InvoiceStatusBadge({ status, className }: Props) {
  const t = useTranslations("Money.invoices.status");

  const styles = {
    draft:
      "border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] text-[hsl(var(--muted-foreground))]",
    sent: "border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]",
    viewed:
      "border-[hsl(var(--info))]/30 bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]",
    paid: "border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
    void: "border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] text-[hsl(var(--muted-foreground))] line-through",
    overdue:
      "border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
        styles[status],
        className,
      )}
    >
      {t(status)}
    </span>
  );
}
