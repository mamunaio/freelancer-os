import "server-only";

import type { OrgRole } from "@/lib/db/models/org-member";
import { isAtLeast } from "./roles";

/**
 * Server-only assertion helpers. Throws on permission failures so server
 * actions can't accidentally swallow them. For pure role math (booleans,
 * `can.*` predicates) import from `./roles` instead — that file is safe to
 * use from client components too.
 */

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

// Re-export pure helpers for ergonomic single-import use on the server.
export { ROLE_RANK, isAtLeast, can } from "./roles";
