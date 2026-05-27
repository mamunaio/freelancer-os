import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

import {
  PROJECT_STATUSES,
  type ProjectStatus,
} from "@/features/projects/constants";

/**
 * `Project` — a unit of delivery work for a client.
 *
 * Money fields use the locked 5-field snapshot (amount, currency, USD,
 * rate, rate date) so reports always aggregate on `budgetAmountUsd`.
 *
 * `billedAmountUsd` is a cached aggregate of issued invoices against this
 * project — recomputed when invoices are created/edited (Phase 8).
 *
 * Project membership lives in a separate collection (`ProjectMember`) so
 * we can index member lookups efficiently and grant per-project roles
 * (lead / contributor) on top of the org-level role.
 */

export { PROJECT_STATUSES };
export type { ProjectStatus };

const projectSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    // Relationships
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },

    // Identity
    name: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: null, maxlength: 8000 },
    techStack: { type: [String], default: [] },

    // Workflow
    status: {
      type: String,
      enum: PROJECT_STATUSES,
      default: "planning",
      index: true,
    },
    pinned: { type: Boolean, default: false, index: true },

    // Money — 5-field snapshot
    budgetAmount: { type: Number, default: 0 },
    budgetCurrency: {
      type: String,
      enum: ["USD", "BDT"],
      default: "USD",
    },
    budgetAmountUsd: { type: Number, default: 0 },
    budgetExchangeRate: { type: Number, default: 1 },
    budgetRateDate: { type: String, default: null },

    // Cached aggregate from Phase 8 invoices.
    billedAmountUsd: { type: Number, default: 0 },

    // Dates
    startedAt: { type: Date, default: null },
    dueAt: { type: Date, default: null, index: true },
    completedAt: { type: Date, default: null },

    // Audit
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, collection: "projects" },
);

// Listings
projectSchema.index({ organizationId: 1, status: 1, updatedAt: -1 });
projectSchema.index({ organizationId: 1, clientId: 1 });
projectSchema.index({ organizationId: 1, pinned: -1, updatedAt: -1 });
projectSchema.index({ organizationId: 1, deletedAt: 1, updatedAt: -1 });

export type ProjectDoc = InferSchemaType<typeof projectSchema> & {
  _id: Types.ObjectId;
};

export const Project = models.Project ?? model("Project", projectSchema);
