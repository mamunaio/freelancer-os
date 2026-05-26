import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  Compass,
  FileText,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  Receipt,
  Repeat2,
  Settings,
  Sparkles,
  Target,
  Timer,
  UserCheck,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";

import type { OrgRole } from "@/lib/db/models/org-member";
import { can } from "@/lib/permissions/roles";

/**
 * Navigation source of truth.
 *
 * Each item declares:
 *  - `href` (relative to the locale prefix)
 *  - `i18nKey` for the label
 *  - `icon`
 *  - `visible(role)` — show this item when the predicate is true
 *  - optional `badge` (e.g., "read-only" for Manager on Finance)
 *  - optional `comingSoon` flag — these stay rendered but with a small dot
 *    so the user knows the route exists but is not built out yet.
 */

export interface NavItem {
  id: string;
  href: string;
  i18nKey: keyof IntlMessages["Nav"];
  icon: LucideIcon;
  visible: (role: OrgRole) => boolean;
  badge?: (role: OrgRole) => "readOnly" | null;
  comingSoon?: boolean;
}

export interface NavGroup {
  id: string;
  i18nKey: keyof IntlMessages["Nav"];
  items: NavItem[];
}

// Loose IntlMessages shape — lets us reference message keys with autocomplete
// without pulling in the full next-intl types here.
interface IntlMessages {
  Nav: Record<string, string>;
}

const showAlways = () => true;

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "workspace",
    i18nKey: "groupWorkspace",
    items: [
      {
        id: "dashboard",
        href: "/dashboard",
        i18nKey: "dashboard",
        icon: LayoutDashboard,
        visible: showAlways,
      },
      {
        id: "myWork",
        href: "/my",
        i18nKey: "myWork",
        icon: Target,
        visible: showAlways,
        comingSoon: true,
      },
      {
        id: "inbox",
        href: "/inbox",
        i18nKey: "inbox",
        icon: Inbox,
        visible: showAlways,
        comingSoon: true,
      },
    ],
  },
  {
    id: "sales",
    i18nKey: "groupSales",
    items: [
      {
        id: "leads",
        href: "/leads",
        i18nKey: "leads",
        icon: Compass,
        visible: (role) => can.manageLeads(role),
        comingSoon: true,
      },
      {
        id: "clients",
        href: "/clients",
        i18nKey: "clients",
        icon: Users,
        visible: showAlways, // members see only assigned, but page-level filter handles it
        comingSoon: true,
      },
      {
        id: "proposals",
        href: "/proposals",
        i18nKey: "proposals",
        icon: FileText,
        visible: (role) => can.manageProposals(role),
        comingSoon: true,
      },
    ],
  },
  {
    id: "delivery",
    i18nKey: "groupDelivery",
    items: [
      {
        id: "projects",
        href: "/projects",
        i18nKey: "projects",
        icon: KanbanSquare,
        visible: showAlways,
        comingSoon: true,
      },
      {
        id: "tasks",
        href: "/tasks",
        i18nKey: "tasks",
        icon: ListChecks,
        visible: showAlways,
        comingSoon: true,
      },
      {
        id: "time",
        href: "/time",
        i18nKey: "time",
        icon: Timer,
        visible: showAlways,
        comingSoon: true,
      },
    ],
  },
  {
    id: "money",
    i18nKey: "groupMoney",
    items: [
      {
        id: "finance",
        href: "/finance",
        i18nKey: "finance",
        icon: Wallet,
        visible: (role) => can.viewFinance(role),
        badge: (role) => (can.editFinance(role) ? null : "readOnly"),
        comingSoon: true,
      },
      {
        id: "invoices",
        href: "/invoices",
        i18nKey: "invoices",
        icon: Receipt,
        visible: (role) => can.viewInvoices(role),
        badge: (role) => (can.editInvoices(role) ? null : "readOnly"),
        comingSoon: true,
      },
      {
        id: "subscriptions",
        href: "/subscriptions",
        i18nKey: "subscriptions",
        icon: Repeat2,
        visible: (role) => can.viewSubscriptions(role),
        badge: (role) => (can.editSubscriptions(role) ? null : "readOnly"),
        comingSoon: true,
      },
    ],
  },
  {
    id: "org",
    i18nKey: "groupOrg",
    items: [
      {
        id: "team",
        href: "/team",
        i18nKey: "team",
        icon: UsersRound,
        visible: (role) => can.viewTeam(role),
        comingSoon: true,
      },
      {
        id: "settings",
        href: "/settings",
        i18nKey: "settings",
        icon: Settings,
        visible: showAlways,
        comingSoon: true,
      },
    ],
  },
];

/** Header brand mark icon (re-exported so the sidebar/header agree on it). */
export const BRAND_ICON: LucideIcon = Sparkles;

/** Used by the dashboard placeholder for "Up next" affordance. */
export const NAV_LOOKUP_ICONS = {
  CalendarDays,
  UserCheck,
} as const;
