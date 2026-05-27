"use server";

import { z } from "zod";
import { customAlphabet } from "nanoid";

import { connectMongoose } from "@/lib/db/client";
import { OrgMember, Organization, User } from "@/lib/db/models";
import { getSession } from "@/lib/auth/session";
import type { Locale } from "@/i18n/routing";

/**
 * Create-workspace flow for orphaned authenticated users.
 *
 * Reachable from `/auth/onboarding`. Used in two situations:
 *  - Signup transactionally failed (user row exists, org/membership missing)
 *  - Admin removed the user from their last org but the User document
 *    survives.
 *
 * Idempotent in spirit: if the caller already has an OrgMember row, we just
 * stamp `activeOrgId` and return success.
 */

const slugAlphabet = customAlphabet(
  "abcdefghijklmnopqrstuvwxyz0123456789",
  6,
);

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

async function uniqueOrgSlug(base: string): Promise<string> {
  await connectMongoose();
  const root = slugify(base) || "studio";
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = attempt === 0 ? root : `${root}-${slugAlphabet()}`;
    const existing = await Organization.findOne({ slug: candidate })
      .select("_id")
      .lean();
    if (!existing) return candidate;
  }
  return `${root}-${slugAlphabet()}-${slugAlphabet()}`;
}

const schema = z.object({
  organizationName: z
    .string()
    .min(2, "Workspace name is required")
    .max(80)
    .trim(),
  locale: z.enum(["en", "bn"]).default("en"),
});

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createWorkspaceAction(
  input: { organizationName: string; locale?: Locale },
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in first." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  await connectMongoose();

  // Recovery: if this user happens to already have an OrgMember (race
  // condition / partial creation), reuse it rather than spawning a duplicate.
  const existingMember = await OrgMember.findOne({
    userId: session.userId,
    status: "active",
  })
    .sort({ createdAt: -1 })
    .lean();

  if (existingMember) {
    await User.updateOne(
      { _id: session.userId },
      { activeOrgId: existingMember.organizationId },
    );
    return { ok: true, data: undefined };
  }

  const slug = await uniqueOrgSlug(parsed.data.organizationName);
  const org = await Organization.create({
    name: parsed.data.organizationName,
    slug,
    ownerId: session.userId,
  });

  await OrgMember.create({
    organizationId: org._id,
    userId: session.userId,
    role: "owner",
    status: "active",
  });

  await User.updateOne(
    { _id: session.userId },
    { activeOrgId: org._id },
  );

  return { ok: true, data: undefined };
}
