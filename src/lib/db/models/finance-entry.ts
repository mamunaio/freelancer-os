import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

import {
  FINANCE_KINDS,
  FINANCE_RECURRING_CADENCES,
  FINANCE_SOURCES,
  type FinanceKind,
  type FinanceRecurringCadence,
  type FinanceSource,
} from "@/features/money/schemas";

/**
 * `FinanceEntry` — a single income or expense row in the agency's ledger.
 *
 * Two write paths:
 *  - Manual entry by Admin+: `source = "manual"`, fully editable.
 *  - Synced from a paid invoice: `source = "invoice"`, edits blocked at
 *    UI + server. Marking the invoice unpaid soft-deletes the row.
 *
 * The five-field money snapshot is stamped at write time and is immutable
 * from then on. Aggregates always sum `amountUsd`.
 */

export {
  FINANCE_KINDS,
  FINANCE_RECURRING_CADENCES,
  FINANCE_SOURCES,
};
export type {
  FinanceKind,
  FinanceRecurringCadence,
  FinanceSource,
};

const recurringSubSchema = new Schema(
  {
    cadence: {
      type: String,
      enum: FINANCE_RECURRING_CADENCES,
      default: "none",
    },
    nextReminderAt: { type: Date, default: null },
    dismissedRemindersAt: { type: [Date], default: [] },
  },
  { _id: false },
);

const financeEntrySchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    kind: { type: String, enum: FINANCE_KINDS, required: true, index: true },
    category: { type: String, required: true, trim: true, maxlength: 80 },

    // Money snapshot
    amount: { type: Number, required: true },
    currency: { type: String, enum: ["USD", "BDT"], required: true },
    amountUsd: { type: Number, required: true },
    exchangeRate: { type: Number, required: true },
    rateDate: { type: String, required: true },

    occurredOn: { type: Date, required: true, index: true },
    description: { type: String, default: null, maxlength: 2_000 },

    taxDeductible: { type: Boolean, default: false },
    taxCategory: { type: String, default: null, trim: true, maxlength: 60 },

    recurring: { type: recurringSubSchema, default: () => ({}) },

    receiptUrl: { type: String, default: null },

    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      default: null,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
      sparse: true,
    },

    source: {
      type: String,
      enum: FINANCE_SOURCES,
      default: "manual",
      required: true,
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, collection: "finance_entries" },
);

// Listings — most queries are scoped by org + occurredOn.
financeEntrySchema.index({ organizationId: 1, occurredOn: -1 });
financeEntrySchema.index({ organizationId: 1, kind: 1, occurredOn: -1 });
financeEntrySchema.index(
  { organizationId: 1, invoiceId: 1 },
  { sparse: true },
);
financeEntrySchema.index({ organizationId: 1, clientId: 1, kind: 1 });
financeEntrySchema.index(
  { organizationId: 1, "recurring.cadence": 1 },
  { sparse: true },
);

export type FinanceEntryDoc = InferSchemaType<typeof financeEntrySchema> & {
  _id: Types.ObjectId;
};

export const FinanceEntry =
  models.FinanceEntry ?? model("FinanceEntry", financeEntrySchema);
