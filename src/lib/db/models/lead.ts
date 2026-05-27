import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

import {
  LEAD_SOURCES,
  LEAD_STAGES,
  type LeadSource,
  type LeadStage,
} from "@/features/leads/constants";

/**
 * `Lead` — pre-sales prospect.
 *
 * Distinct from `Client`: leads live in the funnel until won (or lost). On
 * "Convert to client" we mint a `Client` document and stamp this row's
 * `convertedClientId`. The lead row stays for historical pipeline reporting.
 *
 * Money fields use the same 5-field snapshot pattern as the rest of the app
 * — entered amount + currency + USD-normalised + rate + rate date.
 */

export { LEAD_STAGES, LEAD_SOURCES };
export type { LeadStage, LeadSource };

const leadSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    // Contact
    name: { type: String, required: true, trim: true, maxlength: 120 },
    company: { type: String, default: null, trim: true, maxlength: 160 },
    email: { type: String, default: null, lowercase: true, trim: true },
    phone: { type: String, default: null, trim: true },

    // Pipeline
    stage: {
      type: String,
      enum: LEAD_STAGES,
      default: "new",
      index: true,
    },
    source: {
      type: String,
      enum: LEAD_SOURCES,
      default: "other",
    },

    // Money snapshot (same shape as FinanceEntry / Invoice / Project budget)
    estimatedAmount: { type: Number, default: 0 },
    estimatedCurrency: {
      type: String,
      enum: ["USD", "BDT"],
      default: "USD",
    },
    estimatedAmountUsd: { type: Number, default: 0 },
    estimatedExchangeRate: { type: Number, default: 1 },
    estimatedRateDate: { type: String, default: null }, // yyyy-mm-dd

    // Workflow
    ownerId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    nextActionAt: { type: Date, default: null },
    nextActionNote: { type: String, default: null, maxlength: 500 },

    notes: { type: String, default: null, maxlength: 8000 },

    // Convert-to-client tracking
    convertedClientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },
    convertedAt: { type: Date, default: null },

    // Audit
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, collection: "leads" },
);

// Common listing patterns
leadSchema.index({ organizationId: 1, stage: 1, updatedAt: -1 });
leadSchema.index({ organizationId: 1, ownerId: 1, stage: 1 });
leadSchema.index({ organizationId: 1, deletedAt: 1, updatedAt: -1 });

export type LeadDoc = InferSchemaType<typeof leadSchema> & {
  _id: Types.ObjectId;
};

export const Lead = models.Lead ?? model("Lead", leadSchema);
