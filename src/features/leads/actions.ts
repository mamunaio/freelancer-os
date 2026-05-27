"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Types } from "mongoose";

import { connectMongoose } from "@/lib/db/client";
import { Client, Lead } from "@/lib/db/models";
import { snapshotMoney } from "@/lib/currency/convert";
import { requireOrgContext } from "@/lib/auth/session";
import { assertRole } from "@/lib/permissions/check";
import type { Locale } from "@/i18n/routing";

import { LEAD_SOURCES, LEAD_STAGES } from "./constants";

/**
 * Server actions for the Leads module.
 *
 * Permission: Manager+ across the board. Sales is senior.
 *
 * Convert-to-client (Option B): a separate explicit action even when stage
 * is `won`. This lets agencies finalise contracts/onboarding before the
 * record reaches finance reporting.
 */

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ────────────────────────────────────────────────────────────
// Create
// ────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  company: z.string().trim().max(160).optional().transform((v) => v ?? ""),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .or(z.literal(""))
    .optional()
    .transform((v) => v ?? ""),
  phone: z.string().trim().max(40).optional().transform((v) => v ?? ""),
  stage: z.enum(LEAD_STAGES).default("new"),
  source: z.enum(LEAD_SOURCES).default("other"),
  estimatedAmount: z
    .number({ invalid_type_error: "Enter a number" })
    .min(0)
    .default(0),
  estimatedCurrency: z.enum(["USD", "BDT"]).default("USD"),
  ownerId: z.string().nullable().optional(),
  nextActionAt: z.string().nullable().optional(),
  nextActionNote: z
    .string()
    .max(500)
    .optional()
    .transform((v) => v ?? ""),
  notes: z
    .string()
    .max(8000)
    .optional()
    .transform((v) => v ?? ""),
});

export type CreateLeadInput = z.infer<typeof createSchema>;

export async function createLeadAction(
  input: CreateLeadInput,
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

  const snap = await snapshotMoney({
    amount: parsed.data.estimatedAmount,
    currency: parsed.data.estimatedCurrency,
  });

  const created = await Lead.create({
    organizationId: ctx.organizationId,
    name: parsed.data.name,
    company: parsed.data.company || null,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    stage: parsed.data.stage,
    source: parsed.data.source,
    estimatedAmount: snap.amount,
    estimatedCurrency: snap.currency,
    estimatedAmountUsd: snap.amountUsd,
    estimatedExchangeRate: snap.exchangeRate,
    estimatedRateDate: snap.rateDate,
    ownerId: parsed.data.ownerId
      ? new Types.ObjectId(parsed.data.ownerId)
      : null,
    nextActionAt: parsed.data.nextActionAt
      ? new Date(parsed.data.nextActionAt)
      : null,
    nextActionNote: parsed.data.nextActionNote || null,
    notes: parsed.data.notes || null,
    createdBy: ctx.session.userId,
  });

  revalidatePath(`/${locale}/leads`);
  return { ok: true, data: { id: created._id.toString() } };
}

// ────────────────────────────────────────────────────────────
// Update
// ────────────────────────────────────────────────────────────

const updateSchema = createSchema.extend({
  id: z.string().min(1),
});

export type UpdateLeadInput = z.infer<typeof updateSchema>;

export async function updateLeadAction(
  input: UpdateLeadInput,
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

  const snap = await snapshotMoney({
    amount: parsed.data.estimatedAmount,
    currency: parsed.data.estimatedCurrency,
  });

  const result = await Lead.updateOne(
    { _id: parsed.data.id, organizationId: ctx.organizationId, deletedAt: null },
    {
      name: parsed.data.name,
      company: parsed.data.company || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      stage: parsed.data.stage,
      source: parsed.data.source,
      estimatedAmount: snap.amount,
      estimatedCurrency: snap.currency,
      estimatedAmountUsd: snap.amountUsd,
      estimatedExchangeRate: snap.exchangeRate,
      estimatedRateDate: snap.rateDate,
      ownerId: parsed.data.ownerId
        ? new Types.ObjectId(parsed.data.ownerId)
        : null,
      nextActionAt: parsed.data.nextActionAt
        ? new Date(parsed.data.nextActionAt)
        : null,
      nextActionNote: parsed.data.nextActionNote || null,
      notes: parsed.data.notes || null,
    },
  );

  if (result.matchedCount === 0) {
    return { ok: false, error: "Lead not found." };
  }

  revalidatePath(`/${locale}/leads`);
  return { ok: true, data: undefined };
}

// ────────────────────────────────────────────────────────────
// Change stage (kanban drag)
// ────────────────────────────────────────────────────────────

const changeStageSchema = z.object({
  id: z.string().min(1),
  stage: z.enum(LEAD_STAGES),
});

export async function changeLeadStageAction(
  input: z.infer<typeof changeStageSchema>,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "manager");

  const parsed = changeStageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid stage." };

  await connectMongoose();
  const result = await Lead.updateOne(
    { _id: parsed.data.id, organizationId: ctx.organizationId, deletedAt: null },
    { stage: parsed.data.stage },
  );

  if (result.matchedCount === 0) {
    return { ok: false, error: "Lead not found." };
  }

  revalidatePath(`/${locale}/leads`);
  return { ok: true, data: undefined };
}

// ────────────────────────────────────────────────────────────
// Convert to client (deliberate, only after won)
// ────────────────────────────────────────────────────────────

export async function convertLeadToClientAction(
  leadId: string,
  locale: Locale = "en",
): Promise<ActionResult<{ clientId: string }>> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "manager");

  if (!leadId) return { ok: false, error: "Missing lead id." };

  await connectMongoose();
  const lead = await Lead.findOne({
    _id: leadId,
    organizationId: ctx.organizationId,
    deletedAt: null,
  });
  if (!lead) return { ok: false, error: "Lead not found." };

  if (lead.convertedClientId) {
    return { ok: false, error: "This lead has already been converted." };
  }
  if (lead.stage !== "won") {
    return {
      ok: false,
      error: "Only leads in the 'won' stage can convert to a client.",
    };
  }

  const client = await Client.create({
    organizationId: ctx.organizationId,
    name: lead.name,
    company: lead.company,
    email: lead.email,
    phone: lead.phone,
    notes: lead.notes,
    status: "active",
    createdBy: ctx.session.userId,
  });

  lead.convertedClientId = client._id;
  lead.convertedAt = new Date();
  await lead.save();

  revalidatePath(`/${locale}/leads`);
  revalidatePath(`/${locale}/clients`);
  return { ok: true, data: { clientId: client._id.toString() } };
}

// ────────────────────────────────────────────────────────────
// Soft delete
// ────────────────────────────────────────────────────────────

export async function deleteLeadAction(
  leadId: string,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "manager");

  if (!leadId) return { ok: false, error: "Missing lead id." };

  await connectMongoose();
  const result = await Lead.updateOne(
    { _id: leadId, organizationId: ctx.organizationId, deletedAt: null },
    { deletedAt: new Date() },
  );

  if (result.matchedCount === 0) {
    return { ok: false, error: "Lead not found." };
  }

  revalidatePath(`/${locale}/leads`);
  return { ok: true, data: undefined };
}
