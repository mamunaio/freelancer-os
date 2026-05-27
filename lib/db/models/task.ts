import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

import {
  ENERGY_LEVELS,
  TASK_PRIORITIES,
  TASK_QUADRANTS,
  WORK_TYPES,
  type EnergyLevel,
  type TaskPriority,
  type TaskQuadrant,
  type WorkType,
} from "@/features/tasks/constants";

/**
 * `Task` — atomic unit of work. May hang off a Project (projectId) or live
 * standalone (no project). Sub-tasks supported via `parentTaskId` (one
 * level deep — we explicitly don't support N-deep nesting).
 *
 * Quadrant carries the Eisenhower intent. Priority carries severity. Work
 * type + energy level + estimate are optional planning aids.
 *
 * `done` is the source of truth — `completedAt` is stamped when toggled
 * true, cleared otherwise. Order within a quadrant is `order` (float so
 * inserts don't reshuffle siblings).
 */

export {
  TASK_PRIORITIES,
  TASK_QUADRANTS,
  WORK_TYPES,
  ENERGY_LEVELS,
};
export type { TaskPriority, TaskQuadrant, WorkType, EnergyLevel };

const taskSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    // Optional ownership chain
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },
    parentTaskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      default: null,
      index: true,
    },

    // Identity
    title: { type: String, required: true, trim: true, maxlength: 240 },
    description: { type: String, default: null, maxlength: 8000 },

    // People
    assigneeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },

    // Eisenhower
    quadrant: {
      type: String,
      enum: TASK_QUADRANTS,
      default: "q2",
      index: true,
    },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: "medium",
    },

    // Planning aids
    workType: {
      type: String,
      enum: WORK_TYPES,
      default: null,
    },
    energyLevel: {
      type: String,
      enum: ENERGY_LEVELS,
      default: null,
    },
    estimateMinutes: { type: Number, default: null },

    // Tags — free-form labels.
    tags: { type: [String], default: [] },

    // Schedule + completion
    dueAt: { type: Date, default: null, index: true },
    done: { type: Boolean, default: false, index: true },
    completedAt: { type: Date, default: null },

    // Float so re-ordering doesn't require renumbering siblings.
    order: { type: Number, default: 0 },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, collection: "tasks" },
);

// Common access patterns.
taskSchema.index({ organizationId: 1, done: 1, quadrant: 1, order: 1 });
taskSchema.index({ organizationId: 1, projectId: 1, done: 1, order: 1 });
taskSchema.index({ organizationId: 1, assigneeId: 1, done: 1, dueAt: 1 });
taskSchema.index({ organizationId: 1, deletedAt: 1, updatedAt: -1 });

export type TaskDoc = InferSchemaType<typeof taskSchema> & {
  _id: Types.ObjectId;
};

export const Task = models.Task ?? model("Task", taskSchema);
