import type { OrgRole } from "@/lib/db/models/org-member";

/**
 * Master catalog of dashboard sections.
 *
 * - `id` is the persistence key (stored on User.dashboardLayout.sections).
 * - `i18nKey` resolves under `Dashboard.section.<id>` in the message catalog.
 * - `role` lists which org roles may *see* the section. Hidden sections are
 *   never rendered no matter what the user's saved layout says.
 * - `requiredCan` (optional) is an extra capability check beyond role —
 *   currently only finance gates lean on this.
 * - `locked` sections cannot be toggled off — they're the page anchor.
 *
 * Order in this array is the canonical default order. Per-user reorder /
 * hide is layered on top of that default at render time.
 */

import { can } from "@/lib/permissions/roles";

export type DashboardSectionId =
  | "briefing"
  | "priority"
  | "revenue"
  | "pulse"
  | "stats"
  | "upcoming";

export interface DashboardSection {
  id: DashboardSectionId;
  i18nKey: string;
  role: OrgRole[];
  /** Optional capability gate evaluated alongside role. */
  requiredCan?: (role: OrgRole) => boolean;
  /** Anchor sections that the user can reorder but not hide. */
  locked?: boolean;
}

export const DASHBOARD_SECTIONS: DashboardSection[] = [
  {
    id: "briefing",
    i18nKey: "briefing",
    role: ["owner", "admin", "manager", "member"],
    locked: true,
  },
  {
    id: "priority",
    i18nKey: "priority",
    role: ["owner", "admin", "manager", "member"],
  },
  {
    id: "revenue",
    i18nKey: "revenue",
    role: ["owner", "admin", "manager"],
    requiredCan: (role) => can.viewFinance(role),
  },
  {
    id: "pulse",
    i18nKey: "pulse",
    role: ["owner", "admin", "manager", "member"],
  },
  {
    id: "stats",
    i18nKey: "stats",
    role: ["owner", "admin", "manager", "member"],
  },
  {
    id: "upcoming",
    i18nKey: "upcoming",
    role: ["owner", "admin", "manager", "member"],
  },
];

export interface UserSectionState {
  id: DashboardSectionId;
  visible: boolean;
}

/**
 * Default layout for a brand-new user, role-aware.
 *
 * Members get a leaner default: their priority list and upcoming items, plus
 * the anchor briefing. Managers and above get the full layout.
 */
export function defaultLayoutForRole(role: OrgRole): UserSectionState[] {
  return DASHBOARD_SECTIONS.filter((s) => isVisibleToRole(s, role)).map((s) => ({
    id: s.id,
    visible:
      role === "member"
        ? // Member default: only the must-haves are on.
          s.id === "briefing" ||
          s.id === "priority" ||
          s.id === "upcoming"
        : true,
  }));
}

/** Returns true if the role can ever see this section, ignoring saved layout. */
export function isVisibleToRole(
  section: DashboardSection,
  role: OrgRole,
): boolean {
  if (!section.role.includes(role)) return false;
  if (section.requiredCan && !section.requiredCan(role)) return false;
  return true;
}

/**
 * Merge a user's saved layout with the canonical catalog so it stays valid
 * even after the catalog grows or shrinks. Keeps user's order/visibility for
 * known sections; appends new sections at the end with defaults; drops ids
 * the user no longer has access to.
 */
export function reconcileLayout(
  saved: UserSectionState[] | undefined,
  role: OrgRole,
): UserSectionState[] {
  const allowedIds = new Set(
    DASHBOARD_SECTIONS.filter((s) => isVisibleToRole(s, role)).map((s) => s.id),
  );

  const lockedIds = new Set(
    DASHBOARD_SECTIONS.filter((s) => s.locked).map((s) => s.id),
  );

  const result: UserSectionState[] = [];
  const seen = new Set<DashboardSectionId>();

  // Keep saved entries in their order.
  for (const entry of saved ?? []) {
    if (!allowedIds.has(entry.id) || seen.has(entry.id)) continue;
    result.push({
      id: entry.id,
      // Locked sections are always visible.
      visible: lockedIds.has(entry.id) ? true : Boolean(entry.visible),
    });
    seen.add(entry.id);
  }

  // Append any allowed sections the user didn't have yet, in catalog order.
  for (const section of DASHBOARD_SECTIONS) {
    if (!allowedIds.has(section.id) || seen.has(section.id)) continue;
    result.push({
      id: section.id,
      // New section default visibility follows the role's default.
      visible:
        role === "member"
          ? section.id === "briefing" ||
            section.id === "priority" ||
            section.id === "upcoming"
          : true,
    });
  }

  return result;
}
