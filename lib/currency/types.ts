/**
 * Currency types — kept separate from server-only helpers so client
 * components can import them safely.
 */

/** Currencies the product accepts on input forms today. */
export const SUPPORTED_CURRENCIES = ["USD", "BDT"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

/**
 * The 5-field money snapshot the architecture document locks in.
 *
 * Every monetary record (FinanceEntry, Invoice line totals, Project budget,
 * Subscription, Proposal amount, …) carries this shape. `amountUsd` is the
 * canonical aggregation field — reports always sum `amountUsd`.
 */
export interface MoneySnapshot {
  amount: number;
  currency: Currency;
  amountUsd: number;
  exchangeRate: number;
  rateDate: string; // yyyy-mm-dd
}

/** A flat rate map keyed by currency code (rate vs USD). */
export type RateMap = Partial<Record<string, number>> & {
  /** USD self-rate, always 1. Stored explicitly for symmetry. */
  USD?: 1;
};

/** Helper alias for "either we have full data or we don't". */
export type MoneyInput = {
  amount: number;
  currency: Currency;
};
