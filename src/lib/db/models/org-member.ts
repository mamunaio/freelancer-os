import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

/**
 * `OrgMember` — join row between User and Organization. Carries the user's
 * role inside that org and their membership status.
 *
 * A single User can have multiple OrgMember rows (one per org).
 */

export const ORG_ROLES = ["owner", "admin", "manager", "member"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const ORG_MEMBER_STATUS = ["active", "invited", "suspended"] as const;
export type OrgMemberStatus = (typeof ORG_MEMBER_STATUS)[number];

const orgMemberSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    role: { type: String, enum: ORG_ROLES, required: true },
    status: { type: String, enum: ORG_MEMBER_STATUS, default: "active" },

    invitedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    joinedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true, collection: "org_members" },
);

orgMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
orgMemberSchema.index({ userId: 1, status: 1 });

export type OrgMemberDoc = InferSchemaType<typeof orgMemberSchema> & {
  _id: Types.ObjectId;
};

export const OrgMember = models.OrgMember ?? model("OrgMember", orgMemberSchema);
