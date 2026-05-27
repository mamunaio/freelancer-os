/**
 * Client-safe constants for the Leads module.
 *
 * Same pattern as `@/features/clients/constants` — these live outside the
 * Mongoose model file so client components can import them without
 * dragging Node-only modules into the browser bundle.
 */

export const LEAD_STAGES = [
  "new",
  "contacted",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_SOURCES = [
  "referral",
  "website",
  "cold_outreach",
  "social",
  "event",
  "other",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

/** Stages that count toward "active pipeline" stats. */
export const ACTIVE_STAGES: LeadStage[] = [
  "new",
  "contacted",
  "proposal",
  "negotiation",
];

/** Visual ordering on the kanban — won/lost render as quieter columns at end. */
export const KANBAN_STAGES: LeadStage[] = [
  "new",
  "contacted",
  "proposal",
  "negotiation",
  "won",
  "lost",
];
