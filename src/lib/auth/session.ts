import "server-only";

import { redirect } from "next/navigation";
import { auth } from "./config";
import { connectMongoose } from "@/lib/db/client";
import { OrgMember, Organization } from "@/lib/db/models";
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
 * If the user has no active org (just signed up, no membership yet), they're
 * redirected to the onboarding flow.
 */
export async function requireOrgContext(
  locale: "en" | "bn" = "en",
): Promise<OrgContext> {
  const session = await requireSession(locale);

  await connectMongoose();

  // Pick active org or fall back to the user's most recent membership.
  let orgId = session.activeOrgId;
  if (!orgId) {
    const membership = await OrgMember.findOne({
      userId: session.userId,
      status: "active",
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!membership) {
      // No org yet — push them through onboarding.
      redirect(`/${locale}/auth/onboarding`);
    }

    orgId = membership.organizationId.toString();
  }

  if (!orgId) {
    redirect(`/${locale}/auth/login`);
  }

  const member = await OrgMember.findOne({
    organizationId: orgId,
    userId: session.userId,
    status: "active",
  }).lean();

  if (!member) {
    // They lost access to this org. Bounce to login.
    redirect(`/${locale}/auth/login`);
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
