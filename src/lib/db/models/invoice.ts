import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";
import { customAlphabet } from "nanoid";

import {
  INVOICE_STATUSES,
  type InvoiceStatus,
} from "@/features/money/schemas";

/**
 * `Invoice` — a billable document a client receives.
 *
 * Status lifecycle: draft → sent → viewed → paid (with void as the
 * terminal soft-stop and "overdue" computed at render). Line items are
 * embedded; we never query a single line independent of its invoice.
 *
 * Numbering uses a separate `NumberSequence` collection — see §2.5 of the
 * design doc. The `prefix` and `sequence` are snapshotted on the invoice
 * itself so renaming the prefix later doesn't rewrite history.
 */

export { INVOICE_STATUSES };
export type { InvoiceStatus };

const shareTokenAlphabet = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  28,
);

const lineItemSchema = new Schema(
  {
    description: { type: String, required: true, trim: true, maxlength: 240 },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const invoiceSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    number: { type: String, required: true },
    prefix: { type: String, required: true },
    sequence: { type: Number, required: true },

    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
      sparse: true,
    },

    status: {
      type: String,
      enum: INVOICE_STATUSES,
      default: "draft",
      index: true,
    },

    issueDate: { type: Date, required: true, index: true },
    dueDate: { type: Date, required: true },
    sentAt: { type: Date, default: null },
    viewedAt: { type: Date, default: null },
    paidDate: { type: Date, default: null },
    voidedAt: { type: Date, default: null },

    items: { type: [lineItemSchema], default: [] },

    taxRateOverride: { type: Number, default: null, min: 0, max: 100 },

    // Money snapshot — totals
    subtotal: { type: Number, required: true, default: 0 },
    tax: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true, default: 0 },
    currency: { type: String, enum: ["USD", "BDT"], required: true },
    totalUsd: { type: Number, required: true, default: 0 },
    exchangeRate: { type: Number, required: true, default: 1 },
    rateDate: { type: String, required: true },

    notes: { type: String, default: null, maxlength: 2_000 },
    terms: { type: String, default: null, maxlength: 2_000 },

    shareToken: {
      type: String,
      required: true,
      unique: true,
      default: () => shareTokenAlphabet(),
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, collection: "invoices" },
);

// Per-org uniqueness for the rendered invoice number string.
invoiceSchema.index({ organizationId: 1, number: 1 }, { unique: true });
invoiceSchema.index({ organizationId: 1, status: 1, issueDate: -1 });
invoiceSchema.index({ organizationId: 1, clientId: 1 });
invoiceSchema.index(
  { organizationId: 1, dueDate: 1 },
  { partialFilterExpression: { status: { $in: ["sent", "viewed"] } } },
);
invoiceSchema.index({ shareToken: 1 }, { unique: true });

export type InvoiceDoc = InferSchemaType<typeof invoiceSchema> & {
  _id: Types.ObjectId;
};

export const Invoice = models.Invoice ?? model("Invoice", invoiceSchema);
