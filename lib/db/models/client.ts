import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";
import { customAlphabet } from "nanoid";

import { CLIENT_STATUSES, type ClientStatus } from "@/features/clients/constants";

/**
 * `Client` — a paying / engaged customer of the agency.
 *
 * Distinct from `Lead`: leads live in the pre-sales pipeline. When a lead is
 * "won" it converts into a Client document.
 *
 * Notable fields:
 *  - `portalToken` — unique URL-safe token used by the public client portal
 *    (Phase 10). Auto-generated on insert; never re-used.
 *  - `totalRevenueUsd` — cached aggregate of all invoice/finance entries
 *    against this client. Recomputed from Phase 8 onwards.
 *  - `deletedAt` — soft delete. Listings filter out non-null values.
 *
 * Constants (`CLIENT_STATUSES`, `ClientStatus`) are re-exported here for
 * server callers, and live primarily in `@/features/clients/constants` so
 * client components can import them without dragging Mongoose into the
 * browser bundle.
 */

export { CLIENT_STATUSES };
export type { ClientStatus };

const portalToken = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  24,
);

const clientSchema = new Schema(
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

    // Classification
    status: { type: String, enum: CLIENT_STATUSES, default: "active", index: true },
    tags: { type: [String], default: [] },

    notes: { type: String, default: null },

    // Cached aggregate (USD-normalised). Recomputed from finance entries.
    totalRevenueUsd: { type: Number, default: 0 },

    // Public portal token — used by /portal/[token]
    portalToken: {
      type: String,
      required: true,
      unique: true,
      default: () => portalToken(),
    },

    // Audit
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, collection: "clients" },
);

// Listing indexes — most queries are scoped by org + status.
clientSchema.index({ organizationId: 1, status: 1, updatedAt: -1 });
clientSchema.index({ organizationId: 1, deletedAt: 1, updatedAt: -1 });
clientSchema.index({ portalToken: 1 }, { unique: true });

export type ClientDoc = InferSchemaType<typeof clientSchema> & {
  _id: Types.ObjectId;
};

export const Client = models.Client ?? model("Client", clientSchema);
