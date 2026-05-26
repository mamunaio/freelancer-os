"use client";

import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { LogOut, Settings as SettingsIcon, User as UserIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";
import { useAppShell } from "./app-shell-context";

/**
 * Avatar dropdown in the header. Shows profile, settings, and sign-out.
 */
export function UserMenu() {
  const { session } = useAppShell();
  const t = useTranslations("Header");

  const initials = (session.name ?? session.email)
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "·";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[image:var(--gradient-primary)] text-[11px] font-semibold text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-glow)] transition-transform hover:scale-105 focus-ring"
          aria-label={t("profile")}
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="space-y-0.5">
          <p className="truncate text-sm font-medium">
            {session.name ?? session.email}
          </p>
          <p className="truncate text-[11px] font-normal text-[hsl(var(--muted-foreground))]">
            {session.email}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/profile" className="cursor-pointer">
            <UserIcon className="mr-2 h-3.5 w-3.5" />
            {t("profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <SettingsIcon className="mr-2 h-3.5 w-3.5" />
            {t("settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => signOut({ callbackUrl: "/" })}
          className="cursor-pointer text-[hsl(var(--destructive))] focus:text-[hsl(var(--destructive))]"
        >
          <LogOut className="mr-2 h-3.5 w-3.5" />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
