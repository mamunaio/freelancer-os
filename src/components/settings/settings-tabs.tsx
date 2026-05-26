"use client";

import {
  Building2,
  CreditCard,
  LayoutDashboard,
  Plug,
  User as UserIcon,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Vertical tab strip on desktop, horizontal scroll on mobile.
 *
 * Tabs are passed in as plain serializable objects (server-component-safe).
 * Icon resolution happens here on the client so component references never
 * cross the server/client boundary.
 */

export type SettingsTabIcon =
  | "workspace"
  | "profile"
  | "members"
  | "dashboard"
  | "billing"
  | "integrations";

const ICONS: Record<SettingsTabIcon, LucideIcon> = {
  workspace: Building2,
  profile: UserIcon,
  members: UsersRound,
  dashboard: LayoutDashboard,
  billing: CreditCard,
  integrations: Plug,
};

interface Tab {
  id: SettingsTabIcon;
  href: string;
  label: string;
  exact: boolean;
}

interface Props {
  tabs: Tab[];
}

export function SettingsTabs({ tabs }: Props) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Settings sections"
      className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0"
    >
      <ul className="flex gap-1 md:flex-col">
        {tabs.map((tab) => {
          const Icon = ICONS[tab.id];
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <li key={tab.id} className="shrink-0">
              <Link
                href={tab.href}
                className={cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors focus-ring md:w-full",
                  active
                    ? "bg-[hsl(var(--surface-2))] text-[hsl(var(--foreground))] font-medium"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-2))]/60 hover:text-[hsl(var(--foreground))]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
