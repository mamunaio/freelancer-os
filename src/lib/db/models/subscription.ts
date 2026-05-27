import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

import {
  SUBSCRIPTION_CYCLES,
  SUBSCRIPTION_STATUSES,
  type SubscriptionCycle,
  type SubscriptionStatus,
} from "@/features/money/schemas";

/**
 * `Subscription` — a recurring revenue agreement with a client.
 *
 * Lifecycle: active ⇄ paused, both can transition to cancelled (terminal).
 * The daily cron consults `nextBillingAt` to decide which active +
 * autoInvoice subscriptions to bill. `lastBilledAt` is a forensic stamp;
 * scheduling logic only cares about `nextBillingAt`.
 *
 * Pause behaviour: while paused we don't advance `nextBillingAt`. On
 * resume we reset it to `now + cycle` so the next bill lands a full
 * cycle from the resume date — no back-bills.
 */

export { SUBSCRIPTION_CYCLES, SUBSCRIPTION_STATUSES };
export type { SubscriptionCycle, SubscriptionStatus };

const subscriptionSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },

    name: { type: String, required: true, trim: true, maxlength: 120 },
    status: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      default: "active",
      index: true,
    },

    // Money snapshot — per-cycle amount.
    amount: { type: Number, required: true },
    currency: { type: String, enum: ["USD", "BDT"], required: true },
    amountUsd: { type: Number, required: true },
    exchangeRate: { type: Number, required: true },
    rateDate: { type: String, required: true },

    cycle: { type: String, enum: SUBSCRIPTION_CYCLES, required: true },
    startedAt: { type: Date, required: true },
    nextBillingAt: { type: Date, required: true, index: true },
    lastBilledAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    pausedAt: { type: Date, default: null },

    autoInvoice: { type: Boolean, default: true },
    noteForInvoice: { type: String, default: null, maxlength: 240 },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, collection: "subscriptions" },
);

subscriptionSchema.index({ organizationId: 1, status: 1 });
subscriptionSchema.index(
  { organizationId: 1, nextBillingAt: 1 },
  {
    partialFilterExpression: {
      status: "active",
      autoInvoice: true,
    },
  },
);
subscriptionSchema.index({ organizationId: 1, clientId: 1 });

export type SubscriptionDoc = InferSchemaType<typeof subscriptionSchema> & {
  _id: Types.ObjectId;
};

export const Subscription =
  models.Subscription ?? model("Subscription", subscriptionSchema);
