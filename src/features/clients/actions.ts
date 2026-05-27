"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { connectMongoose } from "@/lib/db/client";
import { Client } from "@/lib/db/models";
import { CLIENT_STATUSES } from "@/features/clients/constants";
import { requireOrgContext } from "@/lib/auth/session";
import { assertRole } from "@/lib/permissions/check";
import type { Locale } from "@/i18n/routing";

/**
 * Server actions for the Clients module.
 *
 * Permission model:
 *  - Manager+ can create, update, archive, delete.
 *  - Member-level callers are blocked outright — they don't see clients
 *    they're not project-linked to anyway.
 *  - All actions re-derive permission from `requireOrgContext` (no JWT
 *    trust). Soft-delete via `deletedAt` so portal links stay resolvable
 *    while reports skip the row.
 */

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ────────────────────────────────────────────────────────────
// Create
// ────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  company: z
    .string()
    .trim()
    .max(160)
    .optional()
    .transform((v) => v ?? ""),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .or(z.literal(""))
    .optional()
    .transform((v) => v ?? ""),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => v ?? ""),
  tags: z.array(z.string().trim().max(40)).max(20).default([]),
  notes: z.string().max(8000).optional().transform((v) => v ?? ""),
});

export type CreateClientInput = z.infer<typeof createSchema>;

export async function createClientAction(
  input: CreateClientInput,
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
  const created = await Client.create({
    organizationId: ctx.organizationId,
    name: parsed.data.name,
    company: parsed.data.company || null,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    tags: dedupeTags(parsed.data.tags),
    notes: parsed.data.notes || null,
    status: "active",
    createdBy: ctx.session.userId,
  });

  revalidatePath(`/${locale}/clients`);
  return { ok: true, data: { id: created._id.toString() } };
}

// ────────────────────────────────────────────────────────────
// Update
// ────────────────────────────────────────────────────────────

const updateSchema = createSchema.extend({
  id: z.string().min(1, "Missing client id"),
});

export type UpdateClientInput = z.infer<typeof updateSchema>;

export async function updateClientAction(
  input: UpdateClientInput,
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
  const result = await Client.updateOne(
    { _id: parsed.data.id, organizationId: ctx.organizationId, deletedAt: null },
    {
      name: parsed.data.name,
      company: parsed.data.company || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      tags: dedupeTags(parsed.data.tags),
      notes: parsed.data.notes || null,
    },
  );

  if (result.matchedCount === 0) {
    return { ok: false, error: "Client not found." };
  }

  revalidatePath(`/${locale}/clients`);
  revalidatePath(`/${locale}/clients/${parsed.data.id}`);
  return { ok: true, data: undefined };
}

// ────────────────────────────────────────────────────────────
// Status changes (pause / resume / archive)
// ────────────────────────────────────────────────────────────

const setStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(CLIENT_STATUSES),
});

export async function setClientStatusAction(
  input: z.infer<typeof setStatusSchema>,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "manager");

  const parsed = setStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid status." };

  await connectMongoose();
  const result = await Client.updateOne(
    { _id: parsed.data.id, organizationId: ctx.organizationId, deletedAt: null },
    { status: parsed.data.status },
  );

  if (result.matchedCount === 0) {
    return { ok: false, error: "Client not found." };
  }

  revalidatePath(`/${locale}/clients`);
  revalidatePath(`/${locale}/clients/${parsed.data.id}`);
  return { ok: true, data: undefined };
}

// ────────────────────────────────────────────────────────────
// Soft delete
// ────────────────────────────────────────────────────────────

export async function deleteClientAction(
  clientId: string,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "manager");

  if (!clientId) return { ok: false, error: "Missing client id." };

  await connectMongoose();
  const result = await Client.updateOne(
    { _id: clientId, organizationId: ctx.organizationId, deletedAt: null },
    { deletedAt: new Date(), status: "archived" },
  );

  if (result.matchedCount === 0) {
    return { ok: false, error: "Client not found." };
  }

  revalidatePath(`/${locale}/clients`);
  return { ok: true, data: undefined };
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function dedupeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}
