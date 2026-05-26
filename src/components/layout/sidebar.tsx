"use client";

import { useTranslations } from "next-intl";
import { ChevronsLeft, ChevronsRight, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useAppShell } from "./app-shell-context";
import { BRAND_ICON, NAV_GROUPS, type NavItem } from "./nav-config";

/**
 * Left-edge navigation. Collapses to icon-only mode (preference persisted to
 * localStorage). Role-aware — items hidden when the role can't see them.
 *
 * Active route detection: the rendered Link's pathname (locale-stripped)
 * compares to the current pathname. We treat anything starting with
 * `${item.href}` as active so /projects/123 highlights "Projects".
 */
export function AppSidebar() {
  const { session, sidebarCollapsed, toggleSidebar } = useAppShell();
  const tNav = useTranslations("Nav");
  const tHeader = useTranslations("Header");
  const pathname = usePathname();

  const initials = (session.name ?? session.email)
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "·";

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))] transition-[width] duration-300 ease-out lg:flex",
        sidebarCollapsed ? "w-[72px]" : "w-[252px]",
      )}
      aria-label={tHeader("workspace")}
    >
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-[hsl(var(--sidebar-border))] px-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
          <BRAND_ICON className="h-4 w-4 text-[hsl(var(--primary-foreground))]" />
        </span>
        {!sidebarCollapsed && (
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-display text-sm font-semibold tracking-tight">
              {session.organizationName}
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
              {session.role}
            </span>
          </div>
        )}
      </div>

      {/* Nav scroll area */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-5">
          {NAV_GROUPS.map((group) => {
            const visible = group.items.filter((it) =>
              it.visible(session.role),
            );
            if (visible.length === 0) return null;

            return (
              <li key={group.id}>
                {!sidebarCollapsed && (
                  <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]/70">
                    {tNav(group.i18nKey)}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {visible.map((item) => (
                    <SidebarItem
                      key={item.id}
                      item={item}
                      role={session.role}
                      pathname={pathname}
                      collapsed={sidebarCollapsed}
                      label={tNav(item.i18nKey)}
                      readOnlyLabel={tNav("readOnly")}
                    />
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer: collapse toggle + user chip */}
      <div className="border-t border-[hsl(var(--sidebar-border))] p-3">
        <button
          onClick={toggleSidebar}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-2 py-1.5 text-[11px] text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))] focus-ring"
          title={
            sidebarCollapsed ? tNav("expand") : tNav("collapse")
          }
        >
          {sidebarCollapsed ? (
            <ChevronsRight className="h-3.5 w-3.5" />
          ) : (
            <>
              <ChevronsLeft className="h-3.5 w-3.5" />
              <span>{tNav("collapse")}</span>
            </>
          )}
        </button>

        <div
          className={cn(
            "flex items-center gap-2.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-2",
            sidebarCollapsed && "justify-center",
          )}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-primary)] text-[10px] font-semibold text-[hsl(var(--primary-foreground))]">
            {initials}
          </span>
          {!sidebarCollapsed && (
            <>
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-xs font-medium">
                  {session.name ?? session.email}
                </span>
                <span className="truncate text-[10px] text-[hsl(var(--muted-foreground))]">
                  {session.email}
                </span>
              </div>
              <button
                onClick={() =>
                  signOut({ callbackUrl: "/" })
                }
                className="ml-auto flex h-6 w-6 items-center justify-center rounded text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--destructive))] focus-ring"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

import type { OrgRole } from "@/lib/db/models/org-member";

interface SidebarItemProps {
  item: NavItem;
  role: OrgRole;
  pathname: string;
  collapsed: boolean;
  label: string;
  readOnlyLabel: string;
}

function SidebarItem({
  item,
  role,
  pathname,
  collapsed,
  label,
  readOnlyLabel,
}: SidebarItemProps) {
  const isActive =
    pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  const badge = item.badge?.(role) ?? null;

  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          "group relative flex items-center gap-3 rounded-md px-2.5 py-1.5 text-sm transition-colors focus-ring",
          isActive
            ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))] font-medium"
            : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]/60 hover:text-[hsl(var(--sidebar-accent-foreground))]",
          collapsed && "justify-center",
        )}
        title={collapsed ? label : undefined}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r bg-[image:var(--gradient-primary)]" />
        )}
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{label}</span>
            {item.comingSoon && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--muted-foreground))]/40"
                title="Coming soon"
                aria-hidden="true"
              />
            )}
            {badge === "readOnly" && (
              <span className="ml-auto rounded border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                {readOnlyLabel}
              </span>
            )}
          </>
        )}
      </Link>
    </li>
  );
}
