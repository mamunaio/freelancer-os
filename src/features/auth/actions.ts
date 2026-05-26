"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { customAlphabet } from "nanoid";

import { connectMongoose } from "@/lib/db/client";
import {
  Invitation,
  OrgMember,
  Organization,
  User,
} from "@/lib/db/models";
import { signIn } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";

/**
 * Server actions for the auth + onboarding surface.
 *
 * - signup: create a User + Organization + OrgMember (owner) atomically.
 * - login:  delegate to Auth.js Credentials provider.
 * - acceptInvitation: turn an Invitation into an OrgMember row.
 *
 * All actions return `{ ok: true }` or `{ ok: false, error }` so client UI can
 * render inline messages without throwing.
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

  // Fallback that's effectively guaranteed unique.
  return `${root}-${slugAlphabet()}-${slugAlphabet()}`;
}

// ──────────────────────────────────────────────────────────────────────
// Sign up
// ──────────────────────────────────────────────────────────────────────

const signupSchema = z.object({
  name: z.string().min(2, "Please enter your name").max(80),
  email: z.string().email("Enter a valid email").toLowerCase(),
  password: z.string().min(8, "Password must be 8+ characters").max(128),
  organizationName: z
    .string()
    .min(2, "Organization name is required")
    .max(80),
  locale: z.enum(["en", "bn"]).default("en"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type ActionResult = { ok: true } | { ok: false; error: string };

export async function signupAction(input: SignupInput): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, email, password, organizationName, locale } = parsed.data;

  await connectMongoose();

  // Reject if email already exists.
  const existing = await User.findOne({ email }).select("_id").lean();
  if (existing) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email,
    passwordHash,
    locale,
    emailVerified: null,
    authProviders: [{ provider: "credentials", providerAccountId: email }],
  });

  const slug = await uniqueOrgSlug(organizationName);

  const org = await Organization.create({
    name: organizationName,
    slug,
    ownerId: user._id,
  });

  await OrgMember.create({
    organizationId: org._id,
    userId: user._id,
    role: "owner",
    status: "active",
  });

  await User.updateOne({ _id: user._id }, { activeOrgId: org._id });

  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────────
// Login
// ──────────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
  locale: z.enum(["en", "bn"]).default("en"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export async function loginAction(input: LoginInput): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email and password." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Invalid email or password." };
  }
}

// ──────────────────────────────────────────────────────────────────────
// Accept invitation
// ──────────────────────────────────────────────────────────────────────

const acceptSchema = z.object({
  token: z.string().min(8),
});

export async function acceptInvitationAction(
  token: string,
): Promise<ActionResult> {
  const parsed = acceptSchema.safeParse({ token });
  if (!parsed.success) return { ok: false, error: "Invalid invitation." };

  const session = await getSession();
  if (!session) {
    redirect(`/auth/login?invite=${encodeURIComponent(token)}`);
  }

  await connectMongoose();

  const invitation = await Invitation.findOne({
    token: parsed.data.token,
    status: "pending",
  });

  if (!invitation) return { ok: false, error: "Invitation not found or already used." };

  if (invitation.expiresAt < new Date()) {
    invitation.status = "expired";
    await invitation.save();
    return { ok: false, error: "This invitation has expired." };
  }

  if (invitation.email !== session.email.toLowerCase()) {
    return {
      ok: false,
      error: `This invitation is for ${invitation.email}.`,
    };
  }

  // Idempotent: if they're already a member, just mark the invite consumed.
  const existing = await OrgMember.findOne({
    organizationId: invitation.organizationId,
    userId: session.userId,
  });

  if (!existing) {
    await OrgMember.create({
      organizationId: invitation.organizationId,
      userId: session.userId,
      role: invitation.role,
      status: "active",
      invitedBy: invitation.invitedBy,
    });
  }

  await User.updateOne(
    { _id: session.userId },
    { activeOrgId: invitation.organizationId },
  );

  invitation.status = "accepted";
  invitation.acceptedAt = new Date();
  await invitation.save();

  return { ok: true };
}
