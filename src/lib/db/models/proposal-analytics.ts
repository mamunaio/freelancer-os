import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

/**
 * `ProposalAnalytics` — tracks proposal views and engagement.
 *
 * Records each time a proposal is viewed via the public share link,
 * including time spent and basic visitor info.
 */

const proposalAnalyticsSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    proposalId: {
      type: Schema.Types.ObjectId,
      ref: "Proposal",
      required: true,
      index: true,
    },

    viewedAt: { type: Date, required: true, default: () => new Date() },
    timeSpentSeconds: { type: Number, default: 0 },

    // Basic visitor tracking
    ipAddress: { type: String, default: null, maxlength: 45 },
    userAgent: { type: String, default: null, maxlength: 500 },
    referrer: { type: String, default: null, maxlength: 500 },
  },
  { timestamps: true, collection: "proposal_analytics" },
);

proposalAnalyticsSchema.index({ proposalId: 1, viewedAt: -1 });
proposalAnalyticsSchema.index({ organizationId: 1, viewedAt: -1 });

export type ProposalAnalyticsDoc = InferSchemaType<typeof proposalAnalyticsSchema> & {
  _id: Types.ObjectId;
};

export const ProposalAnalytics =
  models.ProposalAnalytics ?? model("ProposalAnalytics", proposalAnalyticsSchema);
