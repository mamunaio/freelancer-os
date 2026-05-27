import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

/**
 * `ProposalTemplate` — reusable proposal templates.
 *
 * Templates contain pre-configured sections that can be cloned
 * when creating a new proposal.
 */

const templateSectionSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["text", "pricing", "timeline", "team", "divider"],
      required: true,
    },
    order: { type: Number, required: true },
    content: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const proposalTemplateSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, trim: true, maxlength: 60, default: "General" },

    sections: { type: [templateSectionSchema], default: [] },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, collection: "proposal_templates" },
);

proposalTemplateSchema.index({ organizationId: 1, category: 1 });

export type ProposalTemplateDoc = InferSchemaType<typeof proposalTemplateSchema> & {
  _id: Types.ObjectId;
};

export const ProposalTemplate =
  models.ProposalTemplate ?? model("ProposalTemplate", proposalTemplateSchema);
