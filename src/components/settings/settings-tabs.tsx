"use client";

import type { LucideIcon } from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  exact: boolean;
}

interface Props {
  tabs: Tab[];
}

/**
 * Vertical tab strip on desktop, horizontal scroll on mobile.
 *
 * Active match: when `exact`, only `pathname === href` highlights. Otherwise
 * `pathname.startsWith(href)` so /settings/members/[id] keeps members lit up.
 */
export function SettingsTabs({ tabs }: Props) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Settings sections"
      className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0"
    >
      <ul className="flex gap-1 md:flex-col">
        {tabs.map((tab) => {
          const Icon = tab.icon;
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
