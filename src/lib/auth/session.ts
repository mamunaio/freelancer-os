import "server-only";

import { redirect } from "next/navigation";
import { auth } from "./config";
import { connectMongoose } from "@/lib/db/client";
import { OrgMember, Organization, User } from "@/lib/db/models";
import type { OrgRole } from "@/lib/db/models/org-member";

/**
 * Session helpers for server components, server actions, and route handlers.
 *
 * Always re-derive permission from the database — the JWT only carries the
 * user id and active org id. Roles are checked against `OrgMember` on every
 * sensitive action.
 */

export interface ActiveSession {
  userId: string;
  email: string;
  name: string | null;
  image: string | null;
  locale: "en" | "bn";
  themeMode: "dark" | "light";
  activeOrgId: string | null;
}

/** Returns the session if logged in, or null. Never throws. */
export async function getSession(): Promise<ActiveSession | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  return {
    userId: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
    image: session.user.image ?? null,
    locale: session.user.locale,
    themeMode: session.user.themeMode,
    activeOrgId: session.user.activeOrgId,
  };
}

/** Same as getSession but redirects to /login if not signed in. */
export async function requireSession(
  locale: "en" | "bn" = "en",
): Promise<ActiveSession> {
  const session = await getSession();
  if (!session) redirect(`/${locale}/auth/login`);
  return session;
}

export interface OrgContext {
  session: ActiveSession;
  organizationId: string;
  role: OrgRole;
}

/**
 * Resolves the user's active organization and role.
 *
 * Resolution order (each step falls through to the next on miss):
 *   1. The `activeOrgId` stamped on the JWT — fast path.
 *   2. The user's most recent `OrgMember` row — handles cases where the
 *      JWT cached a stale or now-deleted org id.
 *   3. None found — push to the onboarding recovery page.
 *
 * When step 2 succeeds we also patch `User.activeOrgId` so subsequent
 * requests skip the fallback. JWTs eventually rotate and pick up the new
 * value on the next sign-in.
 */
export async function requireOrgContext(
  locale: "en" | "bn" = "en",
): Promise<OrgContext> {
  const session = await requireSession(locale);

  await connectMongoose();

  const findActiveMembership = async (orgId: string) =>
    OrgMember.findOne({
      organizationId: orgId,
      userId: session.userId,
      status: "active",
    }).lean();

  // Step 1 — fast path on the JWT-stamped org id.
  let orgId = session.activeOrgId;
  let member = orgId ? await findActiveMembership(orgId) : null;

  // Step 2 — fall back to the user's most recent membership.
  if (!member) {
    const fallback = await OrgMember.findOne({
      userId: session.userId,
      status: "active",
    })
      .sort({ createdAt: -1 })
      .lean();

    if (fallback) {
      orgId = fallback.organizationId.toString();
      member = fallback;
      // Self-heal the User record so the next request hits the fast path.
      await User.updateOne(
        { _id: session.userId },
        { activeOrgId: fallback.organizationId },
      );
    }
  }

  if (!member || !orgId) {
    redirect(`/${locale}/auth/onboarding`);
  }

  return { session, organizationId: orgId, role: member.role as OrgRole };
}

/** Convenience: returns the active organization document. */
export async function requireActiveOrganization(locale: "en" | "bn" = "en") {
  const ctx = await requireOrgContext(locale);
  await connectMongoose();
  const org = await Organization.findById(ctx.organizationId).lean();
  if (!org) redirect(`/${locale}/auth/login`);
  return { ctx, organization: org };
}
