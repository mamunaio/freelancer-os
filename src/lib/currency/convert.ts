import "server-only";

import { connectMongoose } from "@/lib/db/client";
import { ExchangeRate } from "@/lib/db/models/exchange-rate";
import type { Currency, MoneyInput, MoneySnapshot, RateMap } from "./types";

/**
 * Currency conversion — server-only.
 *
 * Public API:
 *   - `getLatestRates()` — fetch the freshest cached snapshot. If none
 *     exists (cold DB), we fall back to a hardcoded recent rate so the app
 *     can still write entries while the cron warms up.
 *   - `snapshotMoney(input)` — returns the 5-field snapshot used by every
 *     monetary record. Always normalises to USD.
 *   - `usdAmount(input)` — numeric USD value only, when you don't need the
 *     full snapshot.
 *
 * Currency rule: rates are stored as `1 USD = rate <currency>`. So to
 * convert any currency to USD we divide by its rate.
 */

/** Deterministic fallback used when the cron hasn't populated the DB yet. */
const FALLBACK_RATES: RateMap = {
  USD: 1,
  BDT: 117.5,
  EUR: 0.92,
  GBP: 0.78,
  INR: 83.5,
};
const FALLBACK_RATE_DATE = todayUtcIso();

export interface RatesSnapshot {
  date: string; // yyyy-mm-dd
  rates: RateMap;
  source: string;
}

/** Returns the most recent rate snapshot, falling back if the table is empty. */
export async function getLatestRates(): Promise<RatesSnapshot> {
  await connectMongoose();
  const latest = await ExchangeRate.findOne({ base: "USD" })
    .sort({ date: -1 })
    .lean();

  if (latest) {
    return {
      date: latest.date,
      rates: { USD: 1 as const, ...(latest.rates as Record<string, number>) },
      source: latest.source ?? "open.er-api.com",
    };
  }

  return {
    date: FALLBACK_RATE_DATE,
    rates: { ...FALLBACK_RATES },
    source: "fallback",
  };
}

/**
 * Build the 5-field money snapshot for storage.
 *
 * `entered` is always preserved verbatim. `amountUsd` is the canonical
 * USD-normalised value used by aggregations. The rate and rate date are
 * stamped so the history is self-explanatory even after the daily rate
 * changes.
 */
export async function snapshotMoney(
  input: MoneyInput,
): Promise<MoneySnapshot> {
  if (!Number.isFinite(input.amount)) {
    throw new Error("Amount must be a finite number.");
  }

  if (input.currency === "USD") {
    const dateOnly = todayUtcIso();
    return {
      amount: input.amount,
      currency: "USD",
      amountUsd: input.amount,
      exchangeRate: 1,
      rateDate: dateOnly,
    };
  }

  const snapshot = await getLatestRates();
  const rate = snapshot.rates[input.currency];
  if (typeof rate !== "number" || rate <= 0) {
    throw new Error(`No exchange rate available for ${input.currency}.`);
  }

  // 1 USD = `rate` <currency>. So <amount> <currency> = <amount> / rate USD.
  const amountUsd = input.amount / rate;

  return {
    amount: input.amount,
    currency: input.currency,
    amountUsd: roundTo(amountUsd, 4),
    exchangeRate: rate,
    rateDate: snapshot.date,
  };
}

/** Convenience for callers that only need the USD value. */
export async function usdAmount(input: MoneyInput): Promise<number> {
  const snap = await snapshotMoney(input);
  return snap.amountUsd;
}

/**
 * Convert from one currency to another using the latest snapshot. Used for
 * "live equivalent" tooltips (display only — not for storage).
 */
export async function convertLive(
  amount: number,
  from: Currency,
  to: Currency,
): Promise<number> {
  if (from === to) return amount;
  const snap = await getLatestRates();
  const fromRate = from === "USD" ? 1 : snap.rates[from];
  const toRate = to === "USD" ? 1 : snap.rates[to];
  if (typeof fromRate !== "number" || typeof toRate !== "number") {
    throw new Error(`No rate for ${from}→${to}`);
  }
  const usd = amount / fromRate;
  return roundTo(usd * toRate, 4);
}

function todayUtcIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
