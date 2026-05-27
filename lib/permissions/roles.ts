/**
 * Pure role helpers — safe to import from server OR client code.
 *
 * Server-only assertion helpers live in `./check.ts`; this file keeps the
 * rank table and the `can.*` predicates that are needed for conditional UI
 * rendering on the client side too.
 */

import type { OrgRole } from "@/lib/db/models/org-member";

export const ROLE_RANK: Record<OrgRole, number> = {
  owner: 4,
  admin: 3,
  manager: 2,
  member: 1,
};

/** Returns true when `actor` is the same level as `required` or higher. */
export function isAtLeast(actor: OrgRole, required: OrgRole): boolean {
  return ROLE_RANK[actor] >= ROLE_RANK[required];
}

/**
 * Visibility predicates — return booleans, suitable for conditional UI
 * rendering and `where:` filters. The server still re-checks every mutation
 * via `assertRole` from `./check.ts`.
 */
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
  viewProposals: (role: OrgRole) => isAtLeast(role, "manager"),
  editProposals: (role: OrgRole) => isAtLeast(role, "manager"),

  // Team management page
  viewTeam: (role: OrgRole) => isAtLeast(role, "manager"),
} as const;
