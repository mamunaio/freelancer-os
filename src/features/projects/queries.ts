import "server-only";

import { Types } from "mongoose";

import { connectMongoose } from "@/lib/db/client";
import {
  Client,
  Project,
  ProjectMember,
  ProjectMilestone,
  User,
} from "@/lib/db/models";
import type {
  ProjectMemberRole,
  ProjectStatus,
} from "@/features/projects/constants";
import { ACTIVE_PROJECT_STATUSES } from "@/features/projects/constants";
import type { OrgRole } from "@/lib/db/models/org-member";
import { can } from "@/lib/permissions/roles";

export interface ProjectFilters {
  search?: string;
  status?: ProjectStatus | "any";
  clientId?: string | "any";
  showArchived?: boolean;
  /**
   * When true, only return projects where the given user is a project
   * member. Used to gate the listing for org-level Members.
   */
  visibleTo?: string;
}

export interface ProjectClientLite {
  id: string;
  name: string;
  company: string | null;
}

export interface ProjectMemberRow {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: ProjectMemberRole;
}

export interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  techStack: string[];
  status: ProjectStatus;
  pinned: boolean;

  client: ProjectClientLite | null;

  budgetAmount: number;
  budgetCurrency: "USD" | "BDT";
  budgetAmountUsd: number;
  budgetRateDate: string | null;
  billedAmountUsd: number;

  startedAt: string | null;
  dueAt: string | null;
  completedAt: string | null;

  members: ProjectMemberRow[];

  createdAt: string;
  updatedAt: string;
}

export interface ProjectStats {
  total: number;
  active: number;
  completed: number;
  onHold: number;
  pinned: number;
  /** Sum of active project budgets in USD. */
  activeBudgetUsd: number;
  /** Sum of billed-against-active in USD. */
  activeBilledUsd: number;
}

export interface ProjectMilestoneRow {
  id: string;
  name: string;
  description: string | null;
  dueAt: string | null;
  completedAt: string | null;
  order: number;
}

// ────────────────────────────────────────────────────────────
// List projects
// ────────────────────────────────────────────────────────────

export async function listProjects(
  organizationId: string,
  filters: ProjectFilters = {},
): Promise<ProjectRow[]> {
  await connectMongoose();

  const query: Record<string, unknown> = {
    organizationId,
    deletedAt: null,
  };

  if (filters.status && filters.status !== "any") {
    query.status = filters.status;
  } else if (!filters.showArchived) {
    query.status = { $ne: "archived" };
  }

  if (filters.clientId && filters.clientId !== "any") {
    query.clientId = new Types.ObjectId(filters.clientId);
  }

  if (filters.search?.trim()) {
    const escaped = filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "i");
    query.$or = [{ name: re }, { description: re }, { techStack: re }];
  }

  // Visibility filter — only projects this user is a member of.
  if (filters.visibleTo) {
    const memberOf = await ProjectMember.find({
      organizationId,
      userId: new Types.ObjectId(filters.visibleTo),
    })
      .select("projectId")
      .lean();
    const ids = memberOf.map((m) => m.projectId);
    if (ids.length === 0) return [];
    query._id = { $in: ids };
  }

  const docs = await Project.find(query)
    .sort({ pinned: -1, updatedAt: -1 })
    .lean();

  if (docs.length === 0) return [];

  return hydrateProjects(docs);
}

/**
 * Visibility-aware variant: respects the caller's role. Manager+ sees
 * everything in the org; Members see only projects they're assigned to.
 */
export async function listProjectsForRole(
  organizationId: string,
  userId: string,
  role: OrgRole,
  filters: ProjectFilters = {},
): Promise<ProjectRow[]> {
  if (can.viewAllProjects(role)) {
    return listProjects(organizationId, filters);
  }
  return listProjects(organizationId, { ...filters, visibleTo: userId });
}

// ────────────────────────────────────────────────────────────
// Single project
// ────────────────────────────────────────────────────────────

export async function getProjectById(
  organizationId: string,
  projectId: string,
): Promise<ProjectRow | null> {
  await connectMongoose();
  const doc = await Project.findOne({
    _id: projectId,
    organizationId,
    deletedAt: null,
  }).lean();
  if (!doc) return null;

  const [hydrated] = await hydrateProjects([doc]);
  return hydrated ?? null;
}

export async function getProjectMilestones(
  organizationId: string,
  projectId: string,
): Promise<ProjectMilestoneRow[]> {
  await connectMongoose();
  const docs = await ProjectMilestone.find({
    organizationId,
    projectId,
  })
    .sort({ order: 1, createdAt: 1 })
    .lean();

  return docs.map((d) => ({
    id: d._id.toString(),
    name: String(d.name ?? ""),
    description: (d.description as string | null) ?? null,
    dueAt: d.dueAt ? new Date(d.dueAt).toISOString() : null,
    completedAt: d.completedAt
      ? new Date(d.completedAt).toISOString()
      : null,
    order: Number(d.order ?? 0),
  }));
}

// ────────────────────────────────────────────────────────────
// Stats
// ────────────────────────────────────────────────────────────

export async function getProjectStats(
  organizationId: string,
  options: { visibleTo?: string } = {},
): Promise<ProjectStats> {
  await connectMongoose();

  const match: Record<string, unknown> = {
    organizationId: new Types.ObjectId(organizationId),
    deletedAt: null,
  };

  if (options.visibleTo) {
    const ids = await ProjectMember.find({
      organizationId,
      userId: new Types.ObjectId(options.visibleTo),
    })
      .select("projectId")
      .lean();
    if (ids.length === 0) {
      return {
        total: 0,
        active: 0,
        completed: 0,
        onHold: 0,
        pinned: 0,
        activeBudgetUsd: 0,
        activeBilledUsd: 0,
      };
    }
    match._id = { $in: ids.map((m) => m.projectId) };
  }

  const [agg] = (await Project.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: {
          $sum: {
            $cond: [{ $in: ["$status", ACTIVE_PROJECT_STATUSES] }, 1, 0],
          },
        },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        onHold: {
          $sum: { $cond: [{ $eq: ["$status", "on_hold"] }, 1, 0] },
        },
        pinned: {
          $sum: { $cond: ["$pinned", 1, 0] },
        },
        activeBudgetUsd: {
          $sum: {
            $cond: [
              { $in: ["$status", ACTIVE_PROJECT_STATUSES] },
              "$budgetAmountUsd",
              0,
            ],
          },
        },
        activeBilledUsd: {
          $sum: {
            $cond: [
              { $in: ["$status", ACTIVE_PROJECT_STATUSES] },
              "$billedAmountUsd",
              0,
            ],
          },
        },
      },
    },
  ])) as Array<{
    total: number;
    active: number;
    completed: number;
    onHold: number;
    pinned: number;
    activeBudgetUsd: number;
    activeBilledUsd: number;
  }>;

  return {
    total: agg?.total ?? 0,
    active: agg?.active ?? 0,
    completed: agg?.completed ?? 0,
    onHold: agg?.onHold ?? 0,
    pinned: agg?.pinned ?? 0,
    activeBudgetUsd: Math.round(agg?.activeBudgetUsd ?? 0),
    activeBilledUsd: Math.round(agg?.activeBilledUsd ?? 0),
  };
}

/** Returns true if the user is a member of the given project. */
export async function isProjectMember(
  projectId: string,
  userId: string,
): Promise<boolean> {
  await connectMongoose();
  const found = await ProjectMember.findOne({
    projectId: new Types.ObjectId(projectId),
    userId: new Types.ObjectId(userId),
  })
    .select("_id")
    .lean();
  return Boolean(found);
}

// ────────────────────────────────────────────────────────────
// Hydration helpers — share client + member lookups
// ────────────────────────────────────────────────────────────

async function hydrateProjects(
  docs: Array<Record<string, unknown>>,
): Promise<ProjectRow[]> {
  const clientIds = unique(
    docs
      .map((d) => d.clientId as Types.ObjectId | undefined)
      .filter((v): v is Types.ObjectId => Boolean(v))
      .map((id) => id.toString()),
  );

  const projectIds = docs.map((d) =>
    (d._id as Types.ObjectId).toString(),
  );

  const [clients, members] = await Promise.all([
    clientIds.length
      ? Client.find({ _id: { $in: clientIds } })
          .select("name company")
          .lean()
      : [],
    projectIds.length
      ? ProjectMember.find({ projectId: { $in: projectIds } }).lean()
      : [],
  ]);

  const userIds = unique(
    members.map((m) => (m.userId as Types.ObjectId).toString()),
  );
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } })
        .select("name email")
        .lean()
    : [];

  const clientById = new Map(
    clients.map((c) => [
      c._id.toString(),
      {
        id: c._id.toString(),
        name: String(c.name ?? ""),
        company: (c.company as string | null) ?? null,
      } satisfies ProjectClientLite,
    ]),
  );

  const userById = new Map(
    users.map((u) => [
      u._id.toString(),
      {
        name: u.name ?? u.email ?? "",
        email: u.email ?? "",
      },
    ]),
  );

  const membersByProject = new Map<string, ProjectMemberRow[]>();
  for (const m of members) {
    const projectId = (m.projectId as Types.ObjectId).toString();
    const userIdStr = (m.userId as Types.ObjectId).toString();
    const user = userById.get(userIdStr);
    const list = membersByProject.get(projectId) ?? [];
    list.push({
      id: m._id.toString(),
      userId: userIdStr,
      name: user?.name ?? "(unknown)",
      email: user?.email ?? "",
      role: (m.role as ProjectMemberRole) ?? "contributor",
    });
    membersByProject.set(projectId, list);
  }

  return docs.map((d) => {
    const id = (d._id as Types.ObjectId).toString();
    const clientId = d.clientId
      ? (d.clientId as Types.ObjectId).toString()
      : null;
    return {
      id,
      name: String(d.name ?? ""),
      description: (d.description as string | null) ?? null,
      techStack: Array.isArray(d.techStack) ? (d.techStack as string[]) : [],
      status: (d.status as ProjectStatus) ?? "planning",
      pinned: Boolean(d.pinned),

      client: clientId ? clientById.get(clientId) ?? null : null,

      budgetAmount: Number(d.budgetAmount ?? 0),
      budgetCurrency:
        ((d.budgetCurrency as "USD" | "BDT") ?? "USD") as "USD" | "BDT",
      budgetAmountUsd: Number(d.budgetAmountUsd ?? 0),
      budgetRateDate: (d.budgetRateDate as string | null) ?? null,
      billedAmountUsd: Number(d.billedAmountUsd ?? 0),

      startedAt: d.startedAt ? new Date(d.startedAt as Date).toISOString() : null,
      dueAt: d.dueAt ? new Date(d.dueAt as Date).toISOString() : null,
      completedAt: d.completedAt
        ? new Date(d.completedAt as Date).toISOString()
        : null,

      members: membersByProject.get(id) ?? [],

      createdAt: toIso(d.createdAt),
      updatedAt: toIso(d.updatedAt),
    };
  });
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  return new Date().toISOString();
}
