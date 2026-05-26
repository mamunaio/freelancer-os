import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

/**
 * `Organization` — the top-level tenant. UI calls this a "workspace".
 * Every business record carries an `organizationId` referencing this collection.
 */

const featuresSchema = new Schema(
  {
    publicSignup: { type: Boolean, default: false },
    aiCopilot: { type: Boolean, default: true },
    knowledgeBase: { type: Boolean, default: true },
    subscriptions: { type: Boolean, default: true },
  },
  { _id: false },
);

const organizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    tagline: { type: String, default: null },
    logoUrl: { type: String, default: null },

    // Brand
    accentHsl: { type: String, default: "226 100% 65%" },

    // Money
    baseCurrency: { type: String, enum: ["USD", "BDT"], default: "USD" },
    taxRate: { type: Number, default: 0, min: 0, max: 100 },

    // Owner shortcut — also tracked via OrgMember.role === "owner" but cached
    // here for fast lookup ("who do I bill?").
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    features: { type: featuresSchema, default: () => ({}) },
  },
  { timestamps: true, collection: "organizations" },
);

organizationSchema.index({ slug: 1 }, { unique: true });
organizationSchema.index({ ownerId: 1 });

export type OrganizationDoc = InferSchemaType<typeof organizationSchema> & {
  _id: Types.ObjectId;
};
export type OrganizationId = Types.ObjectId;

export const Organization =
  models.Organization ?? model("Organization", organizationSchema);
