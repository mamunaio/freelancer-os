import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

/**
 * `ProjectMilestone` — checkpoint within a project's timeline.
 *
 * Order is explicit (`order` field) so users can reorder via drag without
 * re-stamping `createdAt`. Completion is a date stamp (or null).
 */

const milestoneSchema = new Schema(
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

    name: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: null, maxlength: 2000 },

    dueAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },

    order: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "project_milestones" },
);

milestoneSchema.index({ projectId: 1, order: 1 });

export type ProjectMilestoneDoc = InferSchemaType<typeof milestoneSchema> & {
  _id: Types.ObjectId;
};

export const ProjectMilestone =
  models.ProjectMilestone ?? model("ProjectMilestone", milestoneSchema);
