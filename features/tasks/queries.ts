import "server-only";

import { Types } from "mongoose";

import { connectMongoose } from "@/lib/db/client";
import {
  Project,
  ProjectMember,
  Task,
  User,
} from "@/lib/db/models";
import {
  type EnergyLevel,
  type TaskPriority,
  type TaskQuadrant,
  type WorkType,
} from "./constants";
import type { OrgRole } from "@/lib/db/models/org-member";
import { can } from "@/lib/permissions/roles";

export interface TaskFilters {
  search?: string;
  quadrant?: TaskQuadrant | "any";
  projectId?: string | "any" | "none";
  assigneeId?: string | "any" | "me" | "unassigned";
  priority?: TaskPriority | "any";
  done?: boolean | "any";
  /** Restrict to tasks the given user can see. */
  visibleTo?: string;
}

export interface TaskAssigneeLite {
  id: string;
  name: string;
  email: string;
}

export interface TaskProjectLite {
  id: string;
  name: string;
}

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;

  project: TaskProjectLite | null;
  assignee: TaskAssigneeLite | null;

  quadrant: TaskQuadrant;
  priority: TaskPriority;
  workType: WorkType | null;
  energyLevel: EnergyLevel | null;
  estimateMinutes: number | null;
  tags: string[];

  dueAt: string | null;
  done: boolean;
  completedAt: string | null;

  order: number;
  parentTaskId: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface TaskStats {
  total: number;
  open: number;
  done: number;
  overdue: number;
  byQuadrant: Record<TaskQuadrant, number>;
  totalEstimateMinutes: number;
}

const PRIORITY_RANK: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

// ────────────────────────────────────────────────────────────
// Listing
// ────────────────────────────────────────────────────────────

export async function listTasks(
  organizationId: string,
  filters: TaskFilters = {},
): Promise<TaskRow[]> {
  await connectMongoose();

  const query: Record<string, unknown> = {
    organizationId,
    deletedAt: null,
  };

  if (filters.quadrant && filters.quadrant !== "any") {
    query.quadrant = filters.quadrant;
  }

  if (filters.priority && filters.priority !== "any") {
    query.priority = filters.priority;
  }

  if (filters.done !== "any" && typeof filters.done === "boolean") {
    query.done = filters.done;
  }

  if (filters.projectId === "none") {
    query.projectId = null;
  } else if (filters.projectId && filters.projectId !== "any") {
    query.projectId = new Types.ObjectId(filters.projectId);
  }

  if (filters.assigneeId === "unassigned") {
    query.assigneeId = null;
  } else if (filters.assigneeId === "me" && filters.visibleTo) {
    query.assigneeId = new Types.ObjectId(filters.visibleTo);
  } else if (
    filters.assigneeId &&
    filters.assigneeId !== "any" &&
    filters.assigneeId !== "me"
  ) {
    query.assigneeId = new Types.ObjectId(filters.assigneeId);
  }

  if (filters.search?.trim()) {
    const escaped = filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "i");
    query.$or = [{ title: re }, { description: re }, { tags: re }];
  }

  // Visibility: limit to tasks the caller can actually see.
  // - assigned to them, OR
  // - on a project they're a member of, OR
  // - standalone tasks they created.
  if (filters.visibleTo) {
    const userId = new Types.ObjectId(filters.visibleTo);
    const memberOf = await ProjectMember.find({
      organizationId,
      userId,
    })
      .select("projectId")
      .lean();
    const projectIds = memberOf.map((m) => m.projectId);

    const visibilityClauses: Record<string, unknown>[] = [
      { assigneeId: userId },
      { createdBy: userId, projectId: null },
    ];
    if (projectIds.length > 0) {
      visibilityClauses.push({ projectId: { $in: projectIds } });
    }
    query.$and = [{ $or: visibilityClauses }];
  }

  const docs = await Task.find(query)
    .sort({ done: 1, order: 1, createdAt: 1 })
    .lean();

  if (docs.length === 0) return [];
  return hydrateTasks(docs);
}

export async function listTasksForRole(
  organizationId: string,
  userId: string,
  role: OrgRole,
  filters: TaskFilters = {},
): Promise<TaskRow[]> {
  // Manager+ can see everything; Members are filtered through visibility.
  if (can.viewAllProjects(role)) {
    return listTasks(organizationId, filters);
  }
  return listTasks(organizationId, { ...filters, visibleTo: userId });
}

// ────────────────────────────────────────────────────────────
// Stats
// ────────────────────────────────────────────────────────────

export async function getTaskStats(
  organizationId: string,
  options: { visibleTo?: string } = {},
): Promise<TaskStats> {
  await connectMongoose();

  const match: Record<string, unknown> = {
    organizationId: new Types.ObjectId(organizationId),
    deletedAt: null,
  };

  if (options.visibleTo) {
    const userId = new Types.ObjectId(options.visibleTo);
    const memberOf = await ProjectMember.find({
      organizationId,
      userId,
    })
      .select("projectId")
      .lean();
    const projectIds = memberOf.map((m) => m.projectId);
    const orClauses: Record<string, unknown>[] = [
      { assigneeId: userId },
      { createdBy: userId, projectId: null },
    ];
    if (projectIds.length > 0) {
      orClauses.push({ projectId: { $in: projectIds } });
    }
    match.$or = orClauses;
  }

  const now = new Date();

  const [agg] = (await Task.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ["$done", false] }, 1, 0] } },
        done: { $sum: { $cond: [{ $eq: ["$done", true] }, 1, 0] } },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$done", false] },
                  { $ne: ["$dueAt", null] },
                  { $lt: ["$dueAt", now] },
                ],
              },
              1,
              0,
            ],
          },
        },
        q1: { $sum: { $cond: [{ $eq: ["$quadrant", "q1"] }, 1, 0] } },
        q2: { $sum: { $cond: [{ $eq: ["$quadrant", "q2"] }, 1, 0] } },
        q3: { $sum: { $cond: [{ $eq: ["$quadrant", "q3"] }, 1, 0] } },
        q4: { $sum: { $cond: [{ $eq: ["$quadrant", "q4"] }, 1, 0] } },
        totalEstimateMinutes: {
          $sum: {
            $cond: [
              { $eq: ["$done", false] },
              { $ifNull: ["$estimateMinutes", 0] },
              0,
            ],
          },
        },
      },
    },
  ])) as Array<{
    total: number;
    open: number;
    done: number;
    overdue: number;
    q1: number;
    q2: number;
    q3: number;
    q4: number;
    totalEstimateMinutes: number;
  }>;

  return {
    total: agg?.total ?? 0,
    open: agg?.open ?? 0,
    done: agg?.done ?? 0,
    overdue: agg?.overdue ?? 0,
    byQuadrant: {
      q1: agg?.q1 ?? 0,
      q2: agg?.q2 ?? 0,
      q3: agg?.q3 ?? 0,
      q4: agg?.q4 ?? 0,
    },
    totalEstimateMinutes: agg?.totalEstimateMinutes ?? 0,
  };
}

// ────────────────────────────────────────────────────────────
// Hydration helpers
// ────────────────────────────────────────────────────────────

async function hydrateTasks(
  docs: Array<Record<string, unknown>>,
): Promise<TaskRow[]> {
  const projectIds = unique(
    docs
      .map((d) => d.projectId as Types.ObjectId | null | undefined)
      .filter((v): v is Types.ObjectId => Boolean(v))
      .map((id) => id.toString()),
  );
  const userIds = unique(
    docs
      .map((d) => d.assigneeId as Types.ObjectId | null | undefined)
      .filter((v): v is Types.ObjectId => Boolean(v))
      .map((id) => id.toString()),
  );

  const [projects, users] = await Promise.all([
    projectIds.length
      ? Project.find({ _id: { $in: projectIds } })
          .select("name")
          .lean()
      : [],
    userIds.length
      ? User.find({ _id: { $in: userIds } })
          .select("name email")
          .lean()
      : [],
  ]);

  const projectById = new Map<string, TaskProjectLite>(
    projects.map((p) => [
      p._id.toString(),
      { id: p._id.toString(), name: String(p.name ?? "") },
    ]),
  );
  const userById = new Map<string, TaskAssigneeLite>(
    users.map((u) => [
      u._id.toString(),
      {
        id: u._id.toString(),
        name: u.name ?? u.email ?? "",
        email: u.email ?? "",
      },
    ]),
  );

  const rows = docs.map((d) => toRow(d, projectById, userById));

  // Stable sort: open first, then by quadrant order, priority rank, then
  // explicit order field.
  rows.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const qOrder = ["q1", "q2", "q3", "q4"];
    const qa = qOrder.indexOf(a.quadrant);
    const qb = qOrder.indexOf(b.quadrant);
    if (qa !== qb) return qa - qb;
    if (a.priority !== b.priority) {
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    }
    return a.order - b.order;
  });

  return rows;
}

function toRow(
  doc: Record<string, unknown>,
  projectMap: Map<string, TaskProjectLite>,
  userMap: Map<string, TaskAssigneeLite>,
): TaskRow {
  const id = (doc._id as Types.ObjectId).toString();
  const projectId = doc.projectId
    ? (doc.projectId as Types.ObjectId).toString()
    : null;
  const assigneeId = doc.assigneeId
    ? (doc.assigneeId as Types.ObjectId).toString()
    : null;
  const parentTaskId = doc.parentTaskId
    ? (doc.parentTaskId as Types.ObjectId).toString()
    : null;

  return {
    id,
    title: String(doc.title ?? ""),
    description: (doc.description as string | null) ?? null,

    project: projectId ? projectMap.get(projectId) ?? null : null,
    assignee: assigneeId ? userMap.get(assigneeId) ?? null : null,

    quadrant: (doc.quadrant as TaskQuadrant) ?? "q2",
    priority: (doc.priority as TaskPriority) ?? "medium",
    workType: (doc.workType as WorkType | null) ?? null,
    energyLevel: (doc.energyLevel as EnergyLevel | null) ?? null,
    estimateMinutes:
      typeof doc.estimateMinutes === "number" ? doc.estimateMinutes : null,
    tags: Array.isArray(doc.tags) ? (doc.tags as string[]) : [],

    dueAt: doc.dueAt ? new Date(doc.dueAt as Date).toISOString() : null,
    done: Boolean(doc.done),
    completedAt: doc.completedAt
      ? new Date(doc.completedAt as Date).toISOString()
      : null,

    order: Number(doc.order ?? 0),
    parentTaskId,

    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  return new Date().toISOString();
}
