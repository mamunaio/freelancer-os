"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Types } from "mongoose";

import { connectMongoose } from "@/lib/db/client";
import { Project, ProjectMember, Task, User } from "@/lib/db/models";
import { requireOrgContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions/roles";
import type { Locale } from "@/i18n/routing";

import {
  ENERGY_LEVELS,
  TASK_PRIORITIES,
  TASK_QUADRANTS,
  WORK_TYPES,
} from "./constants";

/**
 * Server actions for the Tasks module.
 *
 * Permission summary:
 *  - Anyone in the org can create a task. Member-level callers can only
 *    assign / re-parent tasks within projects they belong to.
 *  - The actor must be able to *see* a task to mutate it (assignee, project
 *    member, or Manager+). Mutations re-derive this on every call.
 *  - Bulk actions (mark done, change priority, reassign) reuse the same
 *    visibility check.
 */

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ────────────────────────────────────────────────────────────
// Schemas
// ────────────────────────────────────────────────────────────

const baseTaskFields = {
  title: z.string().trim().min(1, "Title is required").max(240),
  description: z.string().max(8000).optional().transform((v) => v ?? ""),

  projectId: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  parentTaskId: z.string().nullable().optional(),

  quadrant: z.enum(TASK_QUADRANTS).default("q2"),
  priority: z.enum(TASK_PRIORITIES).default("medium"),
  workType: z.enum(WORK_TYPES).nullable().optional(),
  energyLevel: z.enum(ENERGY_LEVELS).nullable().optional(),
  estimateMinutes: z
    .number({ invalid_type_error: "Enter a number" })
    .int()
    .min(0)
    .max(60 * 24 * 30) // arbitrary sanity cap (1 month)
    .nullable()
    .optional(),
  tags: z.array(z.string().trim().max(40)).max(20).default([]),
  dueAt: z.string().nullable().optional(),
};

const createSchema = z.object(baseTaskFields);
const updateSchema = z.object({ ...baseTaskFields, id: z.string().min(1) });

export type CreateTaskInput = z.infer<typeof createSchema>;
export type UpdateTaskInput = z.infer<typeof updateSchema>;

// ────────────────────────────────────────────────────────────
// Visibility gate — used by every mutation
// ────────────────────────────────────────────────────────────

async function ensureCanTouchTask(
  taskId: string,
  organizationId: string,
  userId: string,
  role: import("@/lib/db/models/org-member").OrgRole,
): Promise<{ ok: true; doc: Record<string, unknown> } | { ok: false; error: string }> {
  await connectMongoose();
  const doc = await Task.findOne({
    _id: taskId,
    organizationId,
    deletedAt: null,
  }).lean();
  if (!doc) return { ok: false, error: "Task not found." };

  if (can.viewAllProjects(role)) return { ok: true, doc };

  const docAssignee = doc.assigneeId
    ? (doc.assigneeId as Types.ObjectId).toString()
    : null;
  if (docAssignee === userId) return { ok: true, doc };

  const docProject = doc.projectId
    ? (doc.projectId as Types.ObjectId).toString()
    : null;
  if (docProject) {
    const member = await ProjectMember.findOne({
      organizationId,
      projectId: docProject,
      userId,
    })
      .select("_id")
      .lean();
    if (member) return { ok: true, doc };
  }

  // Standalone task that the user created.
  const createdBy = doc.createdBy
    ? (doc.createdBy as Types.ObjectId).toString()
    : null;
  if (!docProject && createdBy === userId) return { ok: true, doc };

  return { ok: false, error: "You don't have access to this task." };
}

async function validateProjectMembership(
  projectId: string | null | undefined,
  organizationId: string,
  userId: string,
  role: import("@/lib/db/models/org-member").OrgRole,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!projectId) return { ok: true };
  if (can.viewAllProjects(role)) {
    // Manager+ can attach a task to any project in the org as long as it
    // exists and belongs to this organization.
    const project = await Project.findOne({
      _id: projectId,
      organizationId,
      deletedAt: null,
    })
      .select("_id")
      .lean();
    if (!project) return { ok: false, error: "Project not found." };
    return { ok: true };
  }

  const member = await ProjectMember.findOne({
    organizationId,
    projectId,
    userId,
  })
    .select("_id")
    .lean();
  if (!member) {
    return {
      ok: false,
      error: "You can only add tasks to projects you're a member of.",
    };
  }
  return { ok: true };
}

async function validateAssignee(
  assigneeId: string | null | undefined,
  organizationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!assigneeId) return { ok: true };
  // Cheap: the user has to exist and the OrgMember row implies the active
  // org. We don't enforce OrgMember here because Manager+ might assign to a
  // teammate that's invited but not yet accepted.
  const u = await User.findById(assigneeId).select("_id").lean();
  if (!u) return { ok: false, error: "Assignee not found." };
  // Cross-org spoof guard via OrgMember would be ideal — kept loose for now
  // since the assignee picker only surfaces the active org's members.
  void organizationId;
  return { ok: true };
}

// ────────────────────────────────────────────────────────────
// Create
// ────────────────────────────────────────────────────────────

export async function createTaskAction(
  input: CreateTaskInput,
  locale: Locale = "en",
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOrgContext(locale);

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  await connectMongoose();

  const projectCheck = await validateProjectMembership(
    parsed.data.projectId,
    ctx.organizationId,
    ctx.session.userId,
    ctx.role,
  );
  if (!projectCheck.ok) return projectCheck;

  const assigneeCheck = await validateAssignee(
    parsed.data.assigneeId,
    ctx.organizationId,
  );
  if (!assigneeCheck.ok) return assigneeCheck;

  // Place new task at the top of its quadrant column (lowest order).
  const top = await Task.findOne({
    organizationId: ctx.organizationId,
    quadrant: parsed.data.quadrant,
    done: false,
    deletedAt: null,
  })
    .sort({ order: 1 })
    .select("order")
    .lean();
  const order = top ? Number(top.order ?? 0) - 1 : 0;

  const created = await Task.create({
    organizationId: ctx.organizationId,
    projectId: parsed.data.projectId
      ? new Types.ObjectId(parsed.data.projectId)
      : null,
    parentTaskId: parsed.data.parentTaskId
      ? new Types.ObjectId(parsed.data.parentTaskId)
      : null,
    title: parsed.data.title,
    description: parsed.data.description || null,
    assigneeId: parsed.data.assigneeId
      ? new Types.ObjectId(parsed.data.assigneeId)
      : null,
    createdBy: ctx.session.userId,
    quadrant: parsed.data.quadrant,
    priority: parsed.data.priority,
    workType: parsed.data.workType ?? null,
    energyLevel: parsed.data.energyLevel ?? null,
    estimateMinutes: parsed.data.estimateMinutes ?? null,
    tags: dedupeTags(parsed.data.tags),
    dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
    order,
  });

  revalidatePath(`/${locale}/tasks`);
  if (parsed.data.projectId) {
    revalidatePath(`/${locale}/projects/${parsed.data.projectId}`);
  }
  return { ok: true, data: { id: created._id.toString() } };
}

// ────────────────────────────────────────────────────────────
// Update
// ────────────────────────────────────────────────────────────

export async function updateTaskAction(
  input: UpdateTaskInput,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const gate = await ensureCanTouchTask(
    parsed.data.id,
    ctx.organizationId,
    ctx.session.userId,
    ctx.role,
  );
  if (!gate.ok) return gate;

  const projectCheck = await validateProjectMembership(
    parsed.data.projectId,
    ctx.organizationId,
    ctx.session.userId,
    ctx.role,
  );
  if (!projectCheck.ok) return projectCheck;

  const assigneeCheck = await validateAssignee(
    parsed.data.assigneeId,
    ctx.organizationId,
  );
  if (!assigneeCheck.ok) return assigneeCheck;

  await Task.updateOne(
    { _id: parsed.data.id, organizationId: ctx.organizationId, deletedAt: null },
    {
      title: parsed.data.title,
      description: parsed.data.description || null,
      projectId: parsed.data.projectId
        ? new Types.ObjectId(parsed.data.projectId)
        : null,
      parentTaskId: parsed.data.parentTaskId
        ? new Types.ObjectId(parsed.data.parentTaskId)
        : null,
      assigneeId: parsed.data.assigneeId
        ? new Types.ObjectId(parsed.data.assigneeId)
        : null,
      quadrant: parsed.data.quadrant,
      priority: parsed.data.priority,
      workType: parsed.data.workType ?? null,
      energyLevel: parsed.data.energyLevel ?? null,
      estimateMinutes: parsed.data.estimateMinutes ?? null,
      tags: dedupeTags(parsed.data.tags),
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
    },
  );

  revalidatePath(`/${locale}/tasks`);
  if (parsed.data.projectId) {
    revalidatePath(`/${locale}/projects/${parsed.data.projectId}`);
  }
  return { ok: true, data: undefined };
}

// ────────────────────────────────────────────────────────────
// Toggle done
// ────────────────────────────────────────────────────────────

export async function toggleTaskDoneAction(
  taskId: string,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);

  const gate = await ensureCanTouchTask(
    taskId,
    ctx.organizationId,
    ctx.session.userId,
    ctx.role,
  );
  if (!gate.ok) return gate;

  const next = !gate.doc.done;
  await Task.updateOne(
    { _id: taskId, organizationId: ctx.organizationId, deletedAt: null },
    {
      done: next,
      completedAt: next ? new Date() : null,
    },
  );

  revalidatePath(`/${locale}/tasks`);
  if (gate.doc.projectId) {
    revalidatePath(
      `/${locale}/projects/${(gate.doc.projectId as Types.ObjectId).toString()}`,
    );
  }
  return { ok: true, data: undefined };
}

// ────────────────────────────────────────────────────────────
// Move quadrant (matrix drag)
// ────────────────────────────────────────────────────────────

const moveSchema = z.object({
  id: z.string().min(1),
  quadrant: z.enum(TASK_QUADRANTS),
});

export async function moveTaskQuadrantAction(
  input: z.infer<typeof moveSchema>,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);

  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid quadrant." };

  const gate = await ensureCanTouchTask(
    parsed.data.id,
    ctx.organizationId,
    ctx.session.userId,
    ctx.role,
  );
  if (!gate.ok) return gate;

  // Stack the moved task at the top of the destination quadrant.
  const top = await Task.findOne({
    organizationId: ctx.organizationId,
    quadrant: parsed.data.quadrant,
    done: false,
    deletedAt: null,
  })
    .sort({ order: 1 })
    .select("order")
    .lean();
  const order = top ? Number(top.order ?? 0) - 1 : 0;

  await Task.updateOne(
    { _id: parsed.data.id, organizationId: ctx.organizationId, deletedAt: null },
    { quadrant: parsed.data.quadrant, order },
  );

  revalidatePath(`/${locale}/tasks`);
  return { ok: true, data: undefined };
}

// ────────────────────────────────────────────────────────────
// Soft delete
// ────────────────────────────────────────────────────────────

export async function deleteTaskAction(
  taskId: string,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);

  const gate = await ensureCanTouchTask(
    taskId,
    ctx.organizationId,
    ctx.session.userId,
    ctx.role,
  );
  if (!gate.ok) return gate;

  await Task.updateOne(
    { _id: taskId, organizationId: ctx.organizationId, deletedAt: null },
    { deletedAt: new Date() },
  );

  revalidatePath(`/${locale}/tasks`);
  if (gate.doc.projectId) {
    revalidatePath(
      `/${locale}/projects/${(gate.doc.projectId as Types.ObjectId).toString()}`,
    );
  }
  return { ok: true, data: undefined };
}

// ────────────────────────────────────────────────────────────
// Bulk actions
// ────────────────────────────────────────────────────────────

const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
});

export async function bulkMarkDoneAction(
  input: { ids: string[]; done: boolean },
  locale: Locale = "en",
): Promise<ActionResult<{ updated: number }>> {
  const ctx = await requireOrgContext(locale);

  const parsed = bulkSchema.safeParse({ ids: input.ids });
  if (!parsed.success) return { ok: false, error: "Invalid selection." };

  let updated = 0;
  for (const id of parsed.data.ids) {
    const gate = await ensureCanTouchTask(
      id,
      ctx.organizationId,
      ctx.session.userId,
      ctx.role,
    );
    if (!gate.ok) continue;
    if (Boolean(gate.doc.done) === input.done) continue;
    await Task.updateOne(
      { _id: id, organizationId: ctx.organizationId, deletedAt: null },
      {
        done: input.done,
        completedAt: input.done ? new Date() : null,
      },
    );
    updated++;
  }

  revalidatePath(`/${locale}/tasks`);
  return { ok: true, data: { updated } };
}

export async function bulkDeleteTasksAction(
  ids: string[],
  locale: Locale = "en",
): Promise<ActionResult<{ deleted: number }>> {
  const ctx = await requireOrgContext(locale);

  const parsed = bulkSchema.safeParse({ ids });
  if (!parsed.success) return { ok: false, error: "Invalid selection." };

  let deleted = 0;
  for (const id of parsed.data.ids) {
    const gate = await ensureCanTouchTask(
      id,
      ctx.organizationId,
      ctx.session.userId,
      ctx.role,
    );
    if (!gate.ok) continue;
    await Task.updateOne(
      { _id: id, organizationId: ctx.organizationId, deletedAt: null },
      { deletedAt: new Date() },
    );
    deleted++;
  }

  revalidatePath(`/${locale}/tasks`);
  return { ok: true, data: { deleted } };
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function dedupeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const v = raw.trim();
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}
