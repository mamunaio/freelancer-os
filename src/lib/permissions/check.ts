import "server-only";

import type { OrgRole } from "@/lib/db/models/org-member";

/**
 * Permission helpers — single source of truth for "who can do what".
 *
 * Every server action should run input through one of these guards before
 * touching the database. Role is read from `requireOrgContext` (DB-derived,
 * not from the JWT).
 *
 * Layered model:
 *  - org-level role: owner > admin > manager > member
 *  - project-level role layered on top via `withProjectRole`
 */

export const ROLE_RANK: Record<OrgRole, number> = {
  owner: 4,
  admin: 3,
  manager: 2,
  member: 1,
};

/** Compares two roles. `is(actor, "manager")` is true when actor >= manager. */
export function isAtLeast(actor: OrgRole, required: OrgRole): boolean {
  return ROLE_RANK[actor] >= ROLE_RANK[required];
}

// ─────────────────────────────────────────────────────────────────────
// Resource gates — call these from server actions before mutations.
// They intentionally throw so callers don't accidentally swallow them.
// ─────────────────────────────────────────────────────────────────────

export class PermissionError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "PermissionError";
  }
}

export function assertRole(actor: OrgRole, required: OrgRole): void {
  if (!isAtLeast(actor, required)) {
    throw new PermissionError(
      `Role '${actor}' is below required '${required}'.`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────
// Visibility predicates — return booleans, suitable for `where:` filters
// and conditional UI rendering.
// ─────────────────────────────────────────────────────────────────────

export const can = {
  // Members
  inviteMembers: (role: OrgRole) => isAtLeast(role, "admin"),
  removeMembers: (role: OrgRole) => isAtLeast(role, "admin"),
  changeRoles: (role: OrgRole) => isAtLeast(role, "admin"),
  manageBilling: (role: OrgRole) => role === "owner",
  transferOwnership: (role: OrgRole) => role === "owner",

  // Settings
  editWorkspaceSettings: (role: OrgRole) => isAtLeast(role, "admin"),

  // Clients / Leads
  viewAllClients: (role: OrgRole) => isAtLeast(role, "manager"),
  manageClients: (role: OrgRole) => isAtLeast(role, "manager"),
  manageLeads: (role: OrgRole) => isAtLeast(role, "manager"),

  // Projects
  viewAllProjects: (role: OrgRole) => isAtLeast(role, "manager"),
  createProjects: (role: OrgRole) => isAtLeast(role, "manager"),
  archiveProjects: (role: OrgRole) => isAtLeast(role, "manager"),

  // Finance
  viewFinance: (role: OrgRole) => isAtLeast(role, "manager"),
  editFinance: (role: OrgRole) => isAtLeast(role, "admin"),
  viewInvoices: (role: OrgRole) => isAtLeast(role, "manager"),
  editInvoices: (role: OrgRole) => isAtLeast(role, "admin"),
  viewSubscriptions: (role: OrgRole) => isAtLeast(role, "manager"),
  editSubscriptions: (role: OrgRole) => isAtLeast(role, "admin"),

  // Proposals
  manageProposals: (role: OrgRole) => isAtLeast(role, "manager"),
} as const;
