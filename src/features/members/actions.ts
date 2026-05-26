"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { customAlphabet } from "nanoid";

import { connectMongoose } from "@/lib/db/client";
import {
  Invitation,
  Organization,
  OrgMember,
  User,
} from "@/lib/db/models";
import { ORG_ROLES, type OrgRole } from "@/lib/db/models/org-member";
import { requireOrgContext } from "@/lib/auth/session";
import { assertRole, isAtLeast } from "@/lib/permissions/check";
import { logEmail } from "@/lib/email/dev-logger";
import { inviteUrl } from "@/lib/url";
import type { Locale } from "@/i18n/routing";

/**
 * Server actions for members + invitations.
 *
 * Permission rules (re-derived per call, never trusted from the client):
 *   - Invite / revoke / resend / change role / remove → Admin or higher
 *   - Promote someone to Admin                        → Owner only
 *   - Owner is immutable from this surface (use a future "transfer
 *     ownership" flow). Users can't act on themselves here.
 */

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const tokenAlphabet = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  40,
);

const INVITE_TTL_DAYS = 7;
function newExpiry(): Date {
  return new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

// ──────────────────────────────────────────────────────────────────────
// Invite
// ──────────────────────────────────────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().email("Enter a valid email").toLowerCase(),
  role: z.enum(["admin", "manager", "member"]),
});

export type InviteInput = z.infer<typeof inviteSchema>;

export interface InvitePayload {
  email: string;
  role: OrgRole;
  token: string;
  url: string;
  expiresAt: string;
}

export async function inviteMemberAction(
  input: InviteInput,
  locale: Locale = "en",
): Promise<ActionResult<InvitePayload>> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "admin");

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  // Only the owner can grant Admin.
  if (parsed.data.role === "admin" && ctx.role !== "owner") {
    return {
      ok: false,
      error: "Only the owner can invite an Admin.",
    };
  }

  await connectMongoose();

  // Already a member?
  const existingUser = await User.findOne({ email: parsed.data.email })
    .select("_id")
    .lean();
  if (existingUser) {
    const member = await OrgMember.findOne({
      organizationId: ctx.organizationId,
      userId: existingUser._id,
      status: "active",
    });
    if (member) {
      return {
        ok: false,
        error: `${parsed.data.email} is already a member.`,
      };
    }
  }

  // Already invited and pending?
  const existingInvite = await Invitation.findOne({
    organizationId: ctx.organizationId,
    email: parsed.data.email,
    status: "pending",
  });
  if (existingInvite) {
    return {
      ok: false,
      error: `An invitation for ${parsed.data.email} is already pending.`,
    };
  }

  const token = tokenAlphabet();
  const expiresAt = newExpiry();

  await Invitation.create({
    organizationId: ctx.organizationId,
    email: parsed.data.email,
    role: parsed.data.role,
    token,
    expiresAt,
    invitedBy: ctx.session.userId,
    status: "pending",
  });

  const url = inviteUrl(token, locale);

  // Log to console in dev so we can grab the link without an email provider.
  const org = await Organization.findById(ctx.organizationId)
    .select("name")
    .lean();
  logEmail({
    to: parsed.data.email,
    subject: `You're invited to ${org?.name ?? "Injaazh"} on Injaazh OS`,
    body: [
      `You've been invited to join ${org?.name ?? "the workspace"} as a ${parsed.data.role}.`,
      `Accept here: ${url}`,
      `This invitation expires on ${expiresAt.toUTCString()}.`,
    ].join("\n"),
  });

  revalidatePath(`/${locale}/settings/members`);

  return {
    ok: true,
    data: {
      email: parsed.data.email,
      role: parsed.data.role,
      token,
      url,
      expiresAt: expiresAt.toISOString(),
    },
  };
}

// ──────────────────────────────────────────────────────────────────────
// Revoke
// ──────────────────────────────────────────────────────────────────────

export async function revokeInvitationAction(
  invitationId: string,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "admin");

  await connectMongoose();
  const inv = await Invitation.findOne({
    _id: invitationId,
    organizationId: ctx.organizationId,
    status: "pending",
  });
  if (!inv) return { ok: false, error: "Invitation not found." };

  inv.status = "revoked";
  await inv.save();

  revalidatePath(`/${locale}/settings/members`);
  return { ok: true, data: undefined };
}

// ──────────────────────────────────────────────────────────────────────
// Resend (refresh expiry + new token)
// ──────────────────────────────────────────────────────────────────────

export async function resendInvitationAction(
  invitationId: string,
  locale: Locale = "en",
): Promise<ActionResult<InvitePayload>> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "admin");

  await connectMongoose();
  const inv = await Invitation.findOne({
    _id: invitationId,
    organizationId: ctx.organizationId,
    status: "pending",
  });
  if (!inv) return { ok: false, error: "Invitation not found." };

  const token = tokenAlphabet();
  const expiresAt = newExpiry();
  inv.token = token;
  inv.expiresAt = expiresAt;
  await inv.save();

  const url = inviteUrl(token, locale);

  const org = await Organization.findById(ctx.organizationId)
    .select("name")
    .lean();
  logEmail({
    to: inv.email,
    subject: `Updated invitation to ${org?.name ?? "Injaazh"}`,
    body: [
      `Your invitation link has been refreshed.`,
      `Accept here: ${url}`,
      `Expires on ${expiresAt.toUTCString()}.`,
    ].join("\n"),
  });

  revalidatePath(`/${locale}/settings/members`);
  return {
    ok: true,
    data: {
      email: inv.email,
      role: inv.role as OrgRole,
      token,
      url,
      expiresAt: expiresAt.toISOString(),
    },
  };
}

// ──────────────────────────────────────────────────────────────────────
// Change role
// ──────────────────────────────────────────────────────────────────────

const changeRoleSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum(["admin", "manager", "member"]),
});

export async function changeMemberRoleAction(
  input: z.infer<typeof changeRoleSchema>,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "admin");

  const parsed = changeRoleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  await connectMongoose();
  const member = await OrgMember.findOne({
    _id: parsed.data.memberId,
    organizationId: ctx.organizationId,
  });
  if (!member) return { ok: false, error: "Member not found." };

  if (member.role === "owner") {
    return { ok: false, error: "The owner's role can't be changed here." };
  }
  if (member.userId.toString() === ctx.session.userId) {
    return { ok: false, error: "You can't change your own role here." };
  }
  if (parsed.data.role === "admin" && ctx.role !== "owner") {
    return { ok: false, error: "Only the owner can promote someone to Admin." };
  }

  member.role = parsed.data.role;
  await member.save();

  revalidatePath(`/${locale}/settings/members`);
  return { ok: true, data: undefined };
}

// ──────────────────────────────────────────────────────────────────────
// Remove member
// ──────────────────────────────────────────────────────────────────────

export async function removeMemberAction(
  memberId: string,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "admin");

  await connectMongoose();
  const member = await OrgMember.findOne({
    _id: memberId,
    organizationId: ctx.organizationId,
  });
  if (!member) return { ok: false, error: "Member not found." };

  if (member.role === "owner") {
    return {
      ok: false,
      error: "The owner can't be removed. Transfer ownership first.",
    };
  }
  if (member.userId.toString() === ctx.session.userId) {
    return { ok: false, error: "You can't remove yourself." };
  }
  // Admin can't remove another Admin unless caller is Owner.
  if (member.role === "admin" && ctx.role !== "owner") {
    return { ok: false, error: "Only the owner can remove an Admin." };
  }

  await OrgMember.deleteOne({ _id: member._id });

  revalidatePath(`/${locale}/settings/members`);
  return { ok: true, data: undefined };
}

// Re-export the role constant to keep client components from importing the
// model file directly (which is server-only via Mongoose).
export const AVAILABLE_ROLES = ORG_ROLES;
export { isAtLeast };
