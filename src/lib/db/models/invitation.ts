import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";
import { ORG_ROLES, type OrgRole } from "./org-member";

/**
 * `Invitation` — a tokenized email invitation to join an organization.
 *
 * Single-use. The recipient signs up (or signs in if they already have an
 * account) and posts the token to `/accept` which creates an OrgMember.
 */

export const INVITATION_STATUS = [
  "pending",
  "accepted",
  "revoked",
  "expired",
] as const;
export type InvitationStatus = (typeof INVITATION_STATUS)[number];

const invitationSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: { type: String, enum: ORG_ROLES, required: true },

    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: true },

    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: INVITATION_STATUS, default: "pending" },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "invitations" },
);

invitationSchema.index({ token: 1 }, { unique: true });
invitationSchema.index({ organizationId: 1, email: 1, status: 1 });

export type InvitationDoc = InferSchemaType<typeof invitationSchema> & {
  _id: Types.ObjectId;
};
export type InvitationRoleType = OrgRole;

export const Invitation = models.Invitation ?? model("Invitation", invitationSchema);
