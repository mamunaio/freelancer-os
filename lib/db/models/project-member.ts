import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

import {
  PROJECT_MEMBER_ROLES,
  type ProjectMemberRole,
} from "@/features/projects/constants";

/**
 * `ProjectMember` — join row between Project and User. Per-project role
 * (lead | contributor) layered on top of the org role.
 *
 * `lead` = full project control (budget, status, members, milestones).
 * `contributor` = task / file / comment access.
 *
 * The org-level role still wins for cross-cutting concerns (finance is
 * always Admin+ regardless of project role, etc).
 */

export { PROJECT_MEMBER_ROLES };
export type { ProjectMemberRole };

const projectMemberSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    role: { type: String, enum: PROJECT_MEMBER_ROLES, required: true },
    joinedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true, collection: "project_members" },
);

projectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });
projectMemberSchema.index({ organizationId: 1, userId: 1 });

export type ProjectMemberDoc = InferSchemaType<typeof projectMemberSchema> & {
  _id: Types.ObjectId;
};

export const ProjectMember =
  models.ProjectMember ?? model("ProjectMember", projectMemberSchema);
