"use client";

import {
  LayoutDashboard,
  Receipt,
  Repeat2,
  ScrollText,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Tab strip for the /money parent route.
 *
 * Mirrors the Stripe-dashboard pattern: parent label sits in the page
 * header, tabs scroll horizontally on mobile and arrange as a flat
 * row on desktop. Active tab match uses prefix logic so deep links
 * like `/money/invoices/[id]` keep "Invoices" lit up.
 */

type TabId = "overview" | "ledger" | "invoices" | "subscriptions" | "reports";

const TAB_DEFS: Array<{
  id: TabId;
  href: string;
  /** When true, only `pathname === href` highlights. Used for the
   *  Overview tab where the page lives at the parent route itself. */
  exact: boolean;
  icon: LucideIcon;
}> = [
  { id: "overview", href: "/money", exact: true, icon: LayoutDashboard },
  { id: "ledger", href: "/money/ledger", exact: false, icon: ScrollText },
  { id: "invoices", href: "/money/invoices", exact: false, icon: Receipt },
  {
    id: "subscriptions",
    href: "/money/subscriptions",
    exact: false,
    icon: Repeat2,
  },
  { id: "reports", href: "/money/reports", exact: false, icon: TrendingUp },
];

interface Props {
  /** Translated label for each tab id. Provided by the server layout
   *  so this client component doesn't have to call `useTranslations`
   *  for the wrapping namespace. */
  labels: Record<TabId, string>;
}

export function MoneyTabs({ labels }: Props) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Money sections"
      className="-mx-4 mb-4 overflow-x-auto px-4 md:mx-0 md:px-0"
    >
      <ul className="flex items-center gap-1 border-b border-[hsl(var(--border))]">
        {TAB_DEFS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <li key={tab.id} className="shrink-0">
              <Link
                href={tab.href}
                className={cn(
                  "relative flex h-9 items-center gap-1.5 whitespace-nowrap px-3 text-sm transition-colors focus-ring",
                  active
                    ? "font-medium text-[hsl(var(--foreground))]"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {labels[tab.id]}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-t bg-[image:var(--gradient-primary)]"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
