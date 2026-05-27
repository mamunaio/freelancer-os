import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatMoney, formatMoneyCompact } from "@/lib/currency/format";
import type { Currency } from "@/lib/currency/types";
import { cn } from "@/lib/utils";

interface MoneyProps {
  amount: number;
  currency: Currency;
  /** USD-equivalent stored at entry time. When provided AND the display
   * currency is not USD, we expose it in a tooltip so the viewer can sanity
   * check against their reporting currency. */
  amountUsd?: number;
  /** Optional rate date for the tooltip subtitle. */
  rateDate?: string;
  /** Drop the tooltip even if amountUsd is provided. */
  noTooltip?: boolean;
  /** No decimals — stat cards, KPI tiles. */
  compact?: boolean;
  /** Optional CSS class — applied to the visible amount. */
  className?: string;
}

/**
 * Render an amount with its currency. When the original currency isn't USD
 * and a USD snapshot is available, hovering reveals the converted value
 * stamped at entry time (immutable historical record).
 *
 * Pure presentational — works in both server and client components.
 */
export function Money({
  amount,
  currency,
  amountUsd,
  rateDate,
  noTooltip,
  compact,
  className,
}: MoneyProps) {
  const formatted = compact
    ? formatMoneyCompact(amount, currency)
    : formatMoney(amount, currency);

  const showTooltip =
    !noTooltip &&
    typeof amountUsd === "number" &&
    currency !== "USD" &&
    Number.isFinite(amountUsd);

  if (!showTooltip) {
    return (
      <span className={cn("tabular-nums", className)}>{formatted}</span>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "tabular-nums underline decoration-dotted decoration-[hsl(var(--muted-foreground))]/40 underline-offset-2",
              className,
            )}
          >
            {formatted}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs font-medium">
            ≈ {formatMoney(amountUsd!, "USD")}
          </p>
          {rateDate && (
            <p className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">
              Rate as of {rateDate}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
