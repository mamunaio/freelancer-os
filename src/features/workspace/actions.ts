"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { connectMongoose } from "@/lib/db/client";
import { Organization } from "@/lib/db/models";
import { requireOrgContext } from "@/lib/auth/session";
import { assertRole } from "@/lib/permissions/check";
import { parseHsl } from "@/lib/color/hsl";
import type { Locale } from "@/i18n/routing";

/**
 * Server actions for editing the active workspace.
 *
 * Permission: Admin+ only — enforced via `assertRole`. Owners can do
 * everything Admins can, so the same gate covers both.
 */

const workspaceUpdateSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name is too long")
    .trim(),
  tagline: z
    .string()
    .max(160, "Tagline is too long")
    .trim()
    .optional()
    .transform((v) => v ?? ""),
  logoUrl: z
    .string()
    .url("Must be a valid URL")
    .or(z.literal(""))
    .optional()
    .transform((v) => v ?? ""),
  accentHsl: z
    .string()
    .refine((v) => parseHsl(v) !== null, "Accent must be HSL like '226 100% 65%'"),
  baseCurrency: z.enum(["USD", "BDT"]),
  taxRate: z
    .number({ invalid_type_error: "Tax rate must be a number" })
    .min(0)
    .max(100),
});

export type WorkspaceUpdateInput = z.infer<typeof workspaceUpdateSchema>;

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function updateWorkspaceAction(
  input: WorkspaceUpdateInput,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "admin");

  const parsed = workspaceUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  await connectMongoose();
  await Organization.updateOne(
    { _id: ctx.organizationId },
    {
      name: parsed.data.name,
      tagline: parsed.data.tagline || null,
      logoUrl: parsed.data.logoUrl || null,
      accentHsl: parsed.data.accentHsl,
      baseCurrency: parsed.data.baseCurrency,
      taxRate: parsed.data.taxRate,
    },
  );

  // Re-render protected layout so the sidebar/header pick up the new name.
  revalidatePath("/", "layout");

  return { ok: true, data: undefined };
}
