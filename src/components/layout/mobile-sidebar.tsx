"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { signOut } from "next-auth/react";

import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useAppShell } from "./app-shell-context";
import { BRAND_ICON, NAV_GROUPS, type NavItem } from "./nav-config";
import { LogOut } from "lucide-react";
import type { OrgRole } from "@/lib/db/models/org-member";

/**
 * Mobile / tablet sidebar — same nav-config as the desktop sidebar but slides
 * in from the left as a Sheet. Only rendered below the lg breakpoint.
 */
export function MobileSidebar() {
  const { session } = useAppShell();
  const tNav = useTranslations("Nav");
  const tHeader = useTranslations("Header");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))] focus-ring lg:hidden"
          aria-label={tHeader("workspace")}
        >
          <Menu className="h-4 w-4" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[260px] border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))] p-0"
      >
        <SheetHeader className="flex h-14 flex-row items-center gap-2.5 space-y-0 border-b border-[hsl(var(--sidebar-border))] px-4 py-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
            <BRAND_ICON className="h-4 w-4 text-[hsl(var(--primary-foreground))]" />
          </span>
          <div className="flex min-w-0 flex-col items-start leading-tight">
            <SheetTitle className="truncate font-display text-sm font-semibold tracking-tight">
              {session.organizationName}
            </SheetTitle>
            <span className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
              {session.role}
            </span>
          </div>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-5">
            {NAV_GROUPS.map((group) => {
              const visible = group.items.filter((it) =>
                it.visible(session.role),
              );
              if (visible.length === 0) return null;
              return (
                <li key={group.id}>
                  <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]/70">
                    {tNav(group.i18nKey)}
                  </p>
                  <ul className="space-y-0.5">
                    {visible.map((item) => (
                      <MobileItem
                        key={item.id}
                        item={item}
                        pathname={pathname}
                        onNavigate={() => setOpen(false)}
                        label={tNav(item.i18nKey)}
                        readOnlyLabel={tNav("readOnly")}
                        role={session.role}
                      />
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-[hsl(var(--sidebar-border))] p-3">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-3 py-2 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] focus-ring"
          >
            <LogOut className="h-3.5 w-3.5" />
            {tHeader("signOut")}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MobileItem({
  item,
  pathname,
  onNavigate,
  label,
  readOnlyLabel,
  role,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
  label: string;
  readOnlyLabel: string;
  role: OrgRole;
}) {
  const isActive =
    pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  const badge = item.badge?.(role) ?? null;

  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors focus-ring",
          isActive
            ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))] font-medium"
            : "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]/60 hover:text-[hsl(var(--sidebar-accent-foreground))]",
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r bg-[image:var(--gradient-primary)]" />
        )}
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">{label}</span>
        {item.comingSoon && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--muted-foreground))]/40" />
        )}
        {badge === "readOnly" && (
          <span className="ml-auto rounded border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            {readOnlyLabel}
          </span>
        )}
      </Link>
    </li>
  );
}
