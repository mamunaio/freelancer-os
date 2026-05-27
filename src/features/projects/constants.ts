/**
 * Client-safe constants for the Projects module.
 *
 * Same pattern as `@/features/clients/constants` — these live outside the
 * Mongoose model file so client components can import them without
 * dragging Node-only modules into the browser bundle.
 */

export const PROJECT_STATUSES = [
  "planning",
  "in_progress",
  "review",
  "on_hold",
  "completed",
  "archived",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** Stages that count toward "active project" stats and default listing. */
export const ACTIVE_PROJECT_STATUSES: ProjectStatus[] = [
  "planning",
  "in_progress",
  "review",
];

/** Visual ordering for the kanban board. */
export const KANBAN_PROJECT_STATUSES: ProjectStatus[] = [
  "planning",
  "in_progress",
  "review",
  "on_hold",
  "completed",
];

export const PROJECT_MEMBER_ROLES = ["lead", "contributor"] as const;
export type ProjectMemberRole = (typeof PROJECT_MEMBER_ROLES)[number];
