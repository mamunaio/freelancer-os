"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { connectMongoose } from "@/lib/db/client";
import { Organization, User } from "@/lib/db/models";
import { OrgMember } from "@/lib/db/models";
import { requireSession } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/config";
import type { Locale } from "@/i18n/routing";

/**
 * Server actions for the user's own profile.
 *
 * Permission model: every action operates on the current session user's row
 * — never on someone else's. We never accept a userId from the client.
 */

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ──────────────────────────────────────────────────────────────────────
// Profile + preferences
// ──────────────────────────────────────────────────────────────────────

const profileUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(80, "Name is too long")
    .trim(),
  image: z
    .string()
    .url("Avatar must be a valid URL")
    .or(z.literal(""))
    .optional()
    .transform((v) => v ?? ""),
  locale: z.enum(["en", "bn"]),
  themeMode: z.enum(["dark", "light", "system"]),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export async function updateProfileAction(
  input: ProfileUpdateInput,
  locale: Locale = "en",
): Promise<ActionResult> {
  const session = await requireSession(locale);

  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  await connectMongoose();
  await User.updateOne(
    { _id: session.userId },
    {
      name: parsed.data.name,
      image: parsed.data.image || null,
      locale: parsed.data.locale,
      // The User model still uses "dark" | "light"; map "system" to whichever
      // is currently resolved on the client. We persist preference verbatim
      // by storing it as a string — schema allows either value.
      themeMode: parsed.data.themeMode === "system" ? "dark" : parsed.data.themeMode,
    },
  );

  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

// ──────────────────────────────────────────────────────────────────────
// Change password
// ──────────────────────────────────────────────────────────────────────

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(128),
    confirmPassword: z.string().min(1, "Please confirm the new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

export async function updatePasswordAction(
  input: PasswordChangeInput,
  locale: Locale = "en",
): Promise<ActionResult> {
  const session = await requireSession(locale);

  const parsed = passwordChangeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  await connectMongoose();
  const user = await User.findById(session.userId)
    .select("+passwordHash")
    .lean();

  if (!user) return { ok: false, error: "Account not found." };
  if (!user.passwordHash) {
    return {
      ok: false,
      error: "This account doesn't use a password. Sign in with your provider.",
    };
  }

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) return { ok: false, error: "Current password is incorrect." };

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await User.updateOne({ _id: session.userId }, { passwordHash: newHash });

  return { ok: true, data: undefined };
}

// ──────────────────────────────────────────────────────────────────────
// Delete account
// ──────────────────────────────────────────────────────────────────────

const deleteAccountSchema = z.object({
  emailConfirm: z.string().min(3),
});

export async function deleteAccountAction(
  emailConfirm: string,
  locale: Locale = "en",
): Promise<ActionResult> {
  const session = await requireSession(locale);

  const parsed = deleteAccountSchema.safeParse({ emailConfirm });
  if (!parsed.success) return { ok: false, error: "Invalid confirmation." };

  if (parsed.data.emailConfirm.trim().toLowerCase() !== session.email.toLowerCase()) {
    return { ok: false, error: "Email confirmation didn't match." };
  }

  await connectMongoose();

  // Block delete if the user owns any organization — they must transfer
  // ownership first. We surface a friendly error rather than silently
  // orphaning the workspace.
  const ownedOrg = await Organization.findOne({
    ownerId: session.userId,
  }).select("_id name");

  if (ownedOrg) {
    return {
      ok: false,
      error: `You still own '${ownedOrg.name}'. Transfer ownership first.`,
    };
  }

  // Remove org memberships, then the user document itself.
  await OrgMember.deleteMany({ userId: session.userId });
  await User.deleteOne({ _id: session.userId });

  // Sign out the session so the redirect lands on /auth/login.
  await signOut({ redirect: false });

  return { ok: true, data: undefined };
}
