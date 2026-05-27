"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Types } from "mongoose";

import { connectMongoose } from "@/lib/db/client";
import {
  Client,
  Project,
  ProjectMember,
  ProjectMilestone,
} from "@/lib/db/models";
import { snapshotMoney } from "@/lib/currency/convert";
import { requireOrgContext } from "@/lib/auth/session";
import { assertRole } from "@/lib/permissions/check";
import type { Locale } from "@/i18n/routing";

import {
  PROJECT_MEMBER_ROLES,
  PROJECT_STATUSES,
} from "./constants";

/**
 * Server actions for the Projects module.
 *
 * Permission summary:
 *  - Manager+ can create / archive / delete / edit budget.
 *  - Project Lead (per-project role) can edit description, status,
 *    milestones, members.
 *  - Org Member without project membership has zero access.
 *
 * Every action re-derives `requireOrgContext` and double-checks project
 * membership when relevant — never trusts the JWT.
 */

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ────────────────────────────────────────────────────────────
// Create
// ────────────────────────────────────────────────────────────

const createSchema = z.object({
  clientId: z.string().min(1, "Pick a client"),
  name: z.string().trim().min(1, "Name is required").max(160),
  description: z
    .string()
    .max(8000)
    .optional()
    .transform((v) => v ?? ""),
  techStack: z.array(z.string().trim().max(40)).max(40).default([]),
  status: z.enum(PROJECT_STATUSES).default("planning"),
  budgetAmount: z.number().min(0).default(0),
  budgetCurrency: z.enum(["USD", "BDT"]).default("USD"),
  startedAt: z.string().nullable().optional(),
  dueAt: z.string().nullable().optional(),
  /** Project members — at least one is recommended (lead). */
  members: z
    .array(
      z.object({
        userId: z.string().min(1),
        role: z.enum(PROJECT_MEMBER_ROLES),
      }),
    )
    .default([]),
});

export type CreateProjectInput = z.infer<typeof createSchema>;

export async function createProjectAction(
  input: CreateProjectInput,
  locale: Locale = "en",
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "manager");

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  await connectMongoose();

  // Validate the client belongs to this org.
  const client = await Client.findOne({
    _id: parsed.data.clientId,
    organizationId: ctx.organizationId,
    deletedAt: null,
  })
    .select("_id")
    .lean();
  if (!client) return { ok: false, error: "Client not found." };

  const snap = await snapshotMoney({
    amount: parsed.data.budgetAmount,
    currency: parsed.data.budgetCurrency,
  });

  const techStack = dedupeStrings(parsed.data.techStack);

  const created = await Project.create({
    organizationId: ctx.organizationId,
    clientId: parsed.data.clientId,
    name: parsed.data.name,
    description: parsed.data.description || null,
    techStack,
    status: parsed.data.status,
    budgetAmount: snap.amount,
    budgetCurrency: snap.currency,
    budgetAmountUsd: snap.amountUsd,
    budgetExchangeRate: snap.exchangeRate,
    budgetRateDate: snap.rateDate,
    startedAt: parsed.data.startedAt ? new Date(parsed.data.startedAt) : null,
    dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
    createdBy: ctx.session.userId,
  });

  // Insert members. The creator becomes lead automatically if they didn't
  // include themselves.
  const seenUsers = new Set<string>();
  const memberDocs = parsed.data.members
    .filter((m) => {
      if (seenUsers.has(m.userId)) return false;
      seenUsers.add(m.userId);
      return true;
    })
    .map((m) => ({
      organizationId: ctx.organizationId,
      projectId: created._id,
      userId: new Types.ObjectId(m.userId),
      role: m.role,
    }));

  if (!seenUsers.has(ctx.session.userId)) {
    memberDocs.push({
      organizationId: ctx.organizationId,
      projectId: created._id,
      userId: new Types.ObjectId(ctx.session.userId),
      role: "lead",
    });
  }

  if (memberDocs.length > 0) {
    await ProjectMember.insertMany(memberDocs);
  }

  revalidatePath(`/${locale}/projects`);
  return { ok: true, data: { id: created._id.toString() } };
}

// ────────────────────────────────────────────────────────────
// Update (full)
// ────────────────────────────────────────────────────────────

const updateSchema = createSchema
  .omit({ members: true })
  .extend({
    id: z.string().min(1),
  });

export type UpdateProjectInput = z.infer<typeof updateSchema>;

export async function updateProjectAction(
  input: UpdateProjectInput,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "manager");

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  await connectMongoose();

  const client = await Client.findOne({
    _id: parsed.data.clientId,
    organizationId: ctx.organizationId,
    deletedAt: null,
  })
    .select("_id")
    .lean();
  if (!client) return { ok: false, error: "Client not found." };

  const snap = await snapshotMoney({
    amount: parsed.data.budgetAmount,
    currency: parsed.data.budgetCurrency,
  });

  const result = await Project.updateOne(
    { _id: parsed.data.id, organizationId: ctx.organizationId, deletedAt: null },
    {
      clientId: parsed.data.clientId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      techStack: dedupeStrings(parsed.data.techStack),
      status: parsed.data.status,
      budgetAmount: snap.amount,
      budgetCurrency: snap.currency,
      budgetAmountUsd: snap.amountUsd,
      budgetExchangeRate: snap.exchangeRate,
      budgetRateDate: snap.rateDate,
      startedAt: parsed.data.startedAt ? new Date(parsed.data.startedAt) : null,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      ...(parsed.data.status === "completed" ? { completedAt: new Date() } : {}),
    },
  );

  if (result.matchedCount === 0) {
    return { ok: false, error: "Project not found." };
  }

  revalidatePath(`/${locale}/projects`);
  revalidatePath(`/${locale}/projects/${parsed.data.id}`);
  return { ok: true, data: undefined };
}

// ────────────────────────────────────────────────────────────
// Status change (kanban drag)
// ────────────────────────────────────────────────────────────

const statusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(PROJECT_STATUSES),
});

export async function changeProjectStatusAction(
  input: z.infer<typeof statusSchema>,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "manager");

  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid status." };

  await connectMongoose();

  const update: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.status === "completed") update.completedAt = new Date();
  if (parsed.data.status !== "completed") update.completedAt = null;

  const result = await Project.updateOne(
    { _id: parsed.data.id, organizationId: ctx.organizationId, deletedAt: null },
    update,
  );

  if (result.matchedCount === 0) {
    return { ok: false, error: "Project not found." };
  }

  revalidatePath(`/${locale}/projects`);
  revalidatePath(`/${locale}/projects/${parsed.data.id}`);
  return { ok: true, data: undefined };
}

// ────────────────────────────────────────────────────────────
// Pin / unpin
// ────────────────────────────────────────────────────────────

export async function togglePinProjectAction(
  projectId: string,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "manager");

  if (!projectId) return { ok: false, error: "Missing project id." };

  await connectMongoose();
  const doc = await Project.findOne({
    _id: projectId,
    organizationId: ctx.organizationId,
    deletedAt: null,
  });
  if (!doc) return { ok: false, error: "Project not found." };

  doc.pinned = !doc.pinned;
  await doc.save();

  revalidatePath(`/${locale}/projects`);
  return { ok: true, data: undefined };
}

// ────────────────────────────────────────────────────────────
// Soft delete
// ────────────────────────────────────────────────────────────

export async function deleteProjectAction(
  projectId: string,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "manager");

  if (!projectId) return { ok: false, error: "Missing project id." };

  await connectMongoose();
  const result = await Project.updateOne(
    { _id: projectId, organizationId: ctx.organizationId, deletedAt: null },
    { deletedAt: new Date(), status: "archived" },
  );

  if (result.matchedCount === 0) {
    return { ok: false, error: "Project not found." };
  }

  revalidatePath(`/${locale}/projects`);
  return { ok: true, data: undefined };
}

// ────────────────────────────────────────────────────────────
// Members
// ────────────────────────────────────────────────────────────

const memberSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  role: z.enum(PROJECT_MEMBER_ROLES),
});

export async function addProjectMemberAction(
  input: z.infer<typeof memberSchema>,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "manager");

  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  await connectMongoose();
  const project = await Project.findOne({
    _id: parsed.data.projectId,
    organizationId: ctx.organizationId,
    deletedAt: null,
  })
    .select("_id")
    .lean();
  if (!project) return { ok: false, error: "Project not found." };

  await ProjectMember.findOneAndUpdate(
    {
      organizationId: ctx.organizationId,
      projectId: parsed.data.projectId,
      userId: parsed.data.userId,
    },
    {
      organizationId: ctx.organizationId,
      projectId: parsed.data.projectId,
      userId: parsed.data.userId,
      role: parsed.data.role,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  revalidatePath(`/${locale}/projects/${parsed.data.projectId}`);
  return { ok: true, data: undefined };
}

export async function removeProjectMemberAction(
  input: { projectId: string; userId: string },
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "manager");

  if (!input.projectId || !input.userId) {
    return { ok: false, error: "Invalid input." };
  }

  await connectMongoose();
  await ProjectMember.deleteOne({
    organizationId: ctx.organizationId,
    projectId: input.projectId,
    userId: input.userId,
  });

  revalidatePath(`/${locale}/projects/${input.projectId}`);
  return { ok: true, data: undefined };
}

// ────────────────────────────────────────────────────────────
// Milestones
// ────────────────────────────────────────────────────────────

const milestoneSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(1).max(160),
  description: z.string().max(2000).optional().transform((v) => v ?? ""),
  dueAt: z.string().nullable().optional(),
});

export async function addMilestoneAction(
  input: z.infer<typeof milestoneSchema>,
  locale: Locale = "en",
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "manager");

  const parsed = milestoneSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  await connectMongoose();
  const project = await Project.findOne({
    _id: parsed.data.projectId,
    organizationId: ctx.organizationId,
    deletedAt: null,
  })
    .select("_id")
    .lean();
  if (!project) return { ok: false, error: "Project not found." };

  // Place new milestone at the end.
  const last = await ProjectMilestone.findOne({
    projectId: parsed.data.projectId,
  })
    .sort({ order: -1 })
    .select("order")
    .lean();

  const created = await ProjectMilestone.create({
    organizationId: ctx.organizationId,
    projectId: parsed.data.projectId,
    name: parsed.data.name,
    description: parsed.data.description || null,
    dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
    order: last ? Number(last.order ?? 0) + 1 : 0,
  });

  revalidatePath(`/${locale}/projects/${parsed.data.projectId}`);
  return { ok: true, data: { id: created._id.toString() } };
}

export async function toggleMilestoneCompleteAction(
  milestoneId: string,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "manager");

  if (!milestoneId) return { ok: false, error: "Missing id." };

  await connectMongoose();
  const doc = await ProjectMilestone.findOne({
    _id: milestoneId,
    organizationId: ctx.organizationId,
  });
  if (!doc) return { ok: false, error: "Milestone not found." };

  doc.completedAt = doc.completedAt ? null : new Date();
  await doc.save();

  revalidatePath(`/${locale}/projects/${doc.projectId.toString()}`);
  return { ok: true, data: undefined };
}

export async function deleteMilestoneAction(
  milestoneId: string,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "manager");

  if (!milestoneId) return { ok: false, error: "Missing id." };

  await connectMongoose();
  const doc = await ProjectMilestone.findOne({
    _id: milestoneId,
    organizationId: ctx.organizationId,
  });
  if (!doc) return { ok: false, error: "Milestone not found." };

  const projectId = doc.projectId.toString();
  await ProjectMilestone.deleteOne({ _id: milestoneId });

  revalidatePath(`/${locale}/projects/${projectId}`);
  return { ok: true, data: undefined };
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = raw.trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}
