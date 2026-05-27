"use client";

import { useTranslations } from "next-intl";
import { ChevronsLeft, ChevronsRight, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useAppShell } from "./app-shell-context";
import { BRAND_ICON, NAV_GROUPS, type NavItem } from "./nav-config";
import type { OrgRole } from "@/lib/db/models/org-member";

/**
 * Left-edge navigation. Collapses to icon-only mode.
 * Redesigned for an ultra-premium, framer-motion powered, borderless aesthetic.
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
        "sticky top-0 hidden h-screen shrink-0 flex-col bg-[hsl(var(--sidebar-background))] transition-[width] duration-300 ease-out lg:flex",
        sidebarCollapsed ? "w-[72px]" : "w-[252px]",
      )}
      aria-label={tHeader("workspace")}
    >
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 px-4 mt-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] shadow-sm">
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
      <nav className="flex-1 overflow-y-auto px-3 py-6">
        <ul className="space-y-6">
          {NAV_GROUPS.map((group) => {
            const visible = group.items.filter((it) =>
              it.visible(session.role),
            );
            if (visible.length === 0) return null;

            return (
              <li key={group.id}>
                {!sidebarCollapsed && (
                  <p className="mb-2 px-2.5 text-[10px] font-medium uppercase tracking-[0.15em] text-[hsl(var(--muted-foreground))]/70">
                    {tNav(group.i18nKey)}
                  </p>
                )}
                <ul className="space-y-1 relative">
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
      <div className="p-3 pb-4">
        <button
          onClick={toggleSidebar}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-[11px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--foreground))] focus-ring"
          title={
            sidebarCollapsed ? tNav("expand") : tNav("collapse")
          }
        >
          {sidebarCollapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4" />
              <span>{tNav("collapse")}</span>
            </>
          )}
        </button>

        <div
          className={cn(
            "group flex items-center gap-2.5 rounded-xl p-2 transition-colors hover:bg-[hsl(var(--surface-2))]/80 cursor-pointer",
            sidebarCollapsed && "justify-center",
          )}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--surface-3))] text-[11px] font-semibold text-[hsl(var(--foreground))] shadow-sm border border-[hsl(var(--border))]/50">
            {initials}
          </span>
          {!sidebarCollapsed && (
            <>
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-[13px] font-medium">
                  {session.name ?? session.email}
                </span>
                <span className="truncate text-[11px] text-[hsl(var(--muted-foreground))]">
                  {session.email}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  signOut({ callbackUrl: "/" });
                }}
                className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] opacity-0 transition-all group-hover:opacity-100 hover:bg-[hsl(var(--destructive))]/10 hover:text-[hsl(var(--destructive))] focus-ring"
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
          "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] transition-colors focus-ring",
          isActive
            ? "text-[hsl(var(--primary))] font-semibold"
            : "text-[hsl(var(--sidebar-foreground))]/70 hover:text-[hsl(var(--sidebar-foreground))]",
          collapsed && "justify-center",
        )}
        title={collapsed ? label : undefined}
      >
        {isActive && (
          <motion.div
            layoutId="sidebar-active-indicator"
            className="absolute inset-0 rounded-lg bg-[hsl(var(--primary))]/10"
            initial={false}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        <div className="relative z-10 flex items-center gap-3 w-full">
          <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--sidebar-foreground))]/60 group-hover:text-[hsl(var(--sidebar-foreground))]")} />
          {!collapsed && (
            <>
              <span className="flex-1 truncate tracking-tight">{label}</span>
              {item.comingSoon && (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--muted-foreground))]/40"
                  title="Coming soon"
                  aria-hidden="true"
                />
              )}
              {badge === "readOnly" && (
                <span className="ml-auto rounded border border-[hsl(var(--border))]/50 bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  {readOnlyLabel}
                </span>
              )}
            </>
          )}
        </div>
      </Link>
    </li>
  );
}
