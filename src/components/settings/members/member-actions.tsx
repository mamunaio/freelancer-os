"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MoreHorizontal, Trash2, ChevronsUpDown, Loader2 } from "lucide-react";

import {
  changeMemberRoleAction,
  removeMemberAction,
} from "@/features/members/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Locale } from "@/i18n/routing";
import type { OrgRole } from "@/lib/db/models/org-member";
import type { MemberRow } from "@/features/members/queries";

interface Props {
  locale: Locale;
  /** Role of the user *viewing* the page (for permission gates). */
  viewerRole: OrgRole;
  member: MemberRow;
}

/**
 * Per-row kebab menu with role change + remove. The menu is fully suppressed
 * for the row representing the viewer, the owner row (immutable here), and
 * when the viewer doesn't have permission to act.
 */
export function MemberActions({ locale, viewerRole, member }: Props) {
  const t = useTranslations("Members.actions");
  const tErrors = useTranslations("Members.errors");
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // The owner row can't be touched here.
  if (member.role === "owner") return <span aria-hidden="true" />;
  // Viewer can't act on themselves.
  if (member.isYou) return <span aria-hidden="true" />;
  // Admin can't manage another Admin unless they're the Owner.
  if (member.role === "admin" && viewerRole !== "owner") {
    return <span aria-hidden="true" />;
  }

  function changeRole(role: OrgRole) {
    if (role === member.role) return;
    if (role === "admin" && viewerRole !== "owner") {
      toast.error(tErrors("promoteToAdmin"));
      return;
    }
    startTransition(async () => {
      const result = await changeMemberRoleAction(
        { memberId: member.id, role: role as "admin" | "manager" | "member" },
        locale,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("roleChanged"));
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeMemberAction(member.id, locale);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("removed"));
      setConfirmOpen(false);
      router.refresh();
    });
  }

  const canPromoteAdmin = viewerRole === "owner";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--foreground))] focus-ring"
            aria-label={t("changeRole")}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <MoreHorizontal className="h-3.5 w-3.5" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="truncate text-xs">
            {member.name ?? member.email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ChevronsUpDown className="mr-2 h-3.5 w-3.5" />
              {t("changeRole")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={member.role}
                onValueChange={(v) => changeRole(v as OrgRole)}
              >
                {canPromoteAdmin && (
                  <DropdownMenuRadioItem value="admin">
                    Admin
                  </DropdownMenuRadioItem>
                )}
                <DropdownMenuRadioItem value="manager">
                  Manager
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="member">
                  Member
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setConfirmOpen(true);
            }}
            className="text-[hsl(var(--destructive))] focus:text-[hsl(var(--destructive))]"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            {t("remove")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("removeConfirmTitle", { name: member.name ?? member.email })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("removeConfirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                remove();
              }}
              disabled={isPending}
              className="bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:bg-[hsl(var(--destructive))]/90"
            >
              {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {t("removeAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
