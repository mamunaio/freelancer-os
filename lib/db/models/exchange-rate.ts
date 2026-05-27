import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

/**
 * `ExchangeRate` — one snapshot per UTC day of all rates relative to USD.
 *
 * - `base` is always "USD" — every other currency stores its rate as
 *   `<currency> = base * rate`. So 1 USD ≈ 117.5 BDT means `rates.BDT = 117.5`.
 * - `date` is a yyyy-mm-dd string so we can dedupe on day boundaries
 *   without timezone surprises.
 *
 * Rates are immutable once written — we add new snapshots, we don't update
 * old ones. This guarantees a stored historical USD value always traces
 * back to the rate that was live when the entry was logged.
 */

const ratesSchema = new Schema(
  {
    BDT: { type: Number, required: true },
    EUR: { type: Number, default: null },
    GBP: { type: Number, default: null },
    INR: { type: Number, default: null },
  },
  { _id: false, strict: false },
);

const exchangeRateSchema = new Schema(
  {
    base: { type: String, default: "USD" },
    date: { type: String, required: true }, // yyyy-mm-dd
    rates: { type: ratesSchema, required: true },
    source: { type: String, default: "open.er-api.com" },
    fetchedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true, collection: "exchange_rates" },
);

exchangeRateSchema.index({ date: -1 });
exchangeRateSchema.index({ base: 1, date: -1 }, { unique: true });

export type ExchangeRateDoc = InferSchemaType<typeof exchangeRateSchema> & {
  _id: Types.ObjectId;
};

export const ExchangeRate =
  models.ExchangeRate ?? model("ExchangeRate", exchangeRateSchema);
