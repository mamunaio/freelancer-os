/**
 * Display helpers — safe to import from anywhere (no DB, no server-only).
 */

import type { Currency } from "./types";

const FORMATTERS = new Map<string, Intl.NumberFormat>();

/**
 * Cache `Intl.NumberFormat` instances by locale + currency + precision.
 * Constructing them on every render is surprisingly expensive in lists.
 */
function getFormatter(
  locale: string,
  currency: Currency,
  fractionDigits: number,
): Intl.NumberFormat {
  const key = `${locale}|${currency}|${fractionDigits}`;
  let f = FORMATTERS.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    FORMATTERS.set(key, f);
  }
  return f;
}

/**
 * Format an amount as currency. Uses Western numerals in both en and bn
 * (per product decision), so we always pick the `en-US` locale for the
 * actual digits — only the currency symbol respects the user's locale.
 */
export function formatMoney(
  amount: number,
  currency: Currency,
  options?: {
    /** Override the default 2-decimal rendering. */
    fractionDigits?: number;
    /** Drop the symbol entirely (returns "1,234.50"). */
    plain?: boolean;
  },
): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const fd = options?.fractionDigits ?? 2;

  if (options?.plain) {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: fd,
      maximumFractionDigits: fd,
    }).format(safeAmount);
  }

  return getFormatter("en-US", currency, fd).format(safeAmount);
}

/** Compact USD display — no decimals, used in stat cards. */
export function formatMoneyCompact(
  amount: number,
  currency: Currency,
): string {
  return formatMoney(amount, currency, { fractionDigits: 0 });
}

/** Currency symbol for a code. Uses Intl so it stays locale-correct. */
export function currencySymbol(currency: Currency): string {
  return (
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "symbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? currency
  );
}
