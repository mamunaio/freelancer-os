import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";
import { customAlphabet } from "nanoid";

/**
 * `Proposal` — web-based proposal system (Notion-meets-PandaDoc style).
 *
 * Status lifecycle: draft → sent → viewed → accepted (or rejected).
 * Sections are embedded blocks (text, pricing, timeline, team, etc.).
 */

export const PROPOSAL_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "rejected",
] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

const shareTokenAlphabet = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  28,
);

const proposalSectionSchema = new Schema(
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

const proposalSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    title: { type: String, required: true, trim: true, maxlength: 200 },

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

    status: {
      type: String,
      enum: PROPOSAL_STATUSES,
      default: "draft",
      index: true,
    },

    totalValue: { type: Number, required: true, default: 0 },
    currency: { type: String, enum: ["USD", "BDT"], default: "USD" },

    validUntil: { type: Date, required: true },

    sections: { type: [proposalSectionSchema], default: [] },

    // Public share link
    shareToken: {
      type: String,
      required: true,
      unique: true,
      default: () => shareTokenAlphabet(),
    },

    // Timestamps for status transitions
    sentAt: { type: Date, default: null },
    viewedAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, collection: "proposals" },
);

proposalSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
proposalSchema.index({ organizationId: 1, clientId: 1 });
proposalSchema.index({ shareToken: 1 }, { unique: true });

export type ProposalDoc = InferSchemaType<typeof proposalSchema> & {
  _id: Types.ObjectId;
};

export const Proposal = models.Proposal ?? model("Proposal", proposalSchema);
