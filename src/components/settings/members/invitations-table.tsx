"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy, Loader2, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";

import {
  resendInvitationAction,
  revokeInvitationAction,
} from "@/features/members/actions";
import { inviteUrlFromToken } from "@/features/members/url-helper";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoleBadge } from "./role-badge";
import type { InvitationRow } from "@/features/members/queries";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
  invitations: InvitationRow[];
}

export function InvitationsTable({ locale, invitations }: Props) {
  const t = useTranslations("Members.invitations");
  const tActions = useTranslations("Members.invitations.actions");
  const tMemberActions = useTranslations("Members.actions");
  const format = useFormatter();
  const now = useNow({ updateInterval: 0 });
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (invitations.length === 0) {
    return (
      <p className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] px-4 py-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
        {t("empty")}
      </p>
    );
  }

  async function copyLink(token: string) {
    try {
      const url = inviteUrlFromToken(token, locale);
      await navigator.clipboard.writeText(url);
      toast.success(tActions("linkCopied"));
    } catch {
      toast.error("Couldn't copy.");
    }
  }

  function resend(id: string) {
    startTransition(async () => {
      const result = await resendInvitationAction(id, locale);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(tActions("resent"));
      router.refresh();
    });
  }

  function revoke(id: string) {
    startTransition(async () => {
      const result = await revokeInvitationAction(id, locale);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(tActions("revoked"));
      setConfirmId(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))]">
        <table className="w-full text-sm">
          <thead className="bg-[hsl(var(--surface-2))] text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold">
                {t("table.email")}
              </th>
              <th className="px-4 py-2.5 text-left font-semibold">
                {t("table.role")}
              </th>
              <th className="px-4 py-2.5 text-left font-semibold">
                {t("table.expires")}
              </th>
              <th className="w-10 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {invitations.map((inv, i) => {
              const expired = new Date(inv.expiresAt) <= now;
              return (
                <tr
                  key={inv.id}
                  className={
                    i === invitations.length - 1
                      ? ""
                      : "border-b border-[hsl(var(--border))]"
                  }
                >
                  <td className="px-4 py-3">
                    <p className="truncate text-sm">{inv.email}</p>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                      {format.relativeTime(new Date(inv.createdAt), now)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={inv.role} />
                  </td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                    {expired ? (
                      <span className="text-[hsl(var(--destructive))]">
                        {t("expired")}
                      </span>
                    ) : (
                      <span
                        title={format.dateTime(new Date(inv.expiresAt), {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      >
                        {format.relativeTime(new Date(inv.expiresAt), now)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--foreground))] focus-ring"
                          aria-label={tActions("copyLink")}
                          disabled={isPending}
                        >
                          {isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onSelect={() => copyLink(inv.token)}>
                          <Copy className="mr-2 h-3.5 w-3.5" />
                          {tActions("copyLink")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => resend(inv.id)}>
                          <RefreshCw className="mr-2 h-3.5 w-3.5" />
                          {tActions("resend")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            setConfirmId(inv.id);
                          }}
                          className="text-[hsl(var(--destructive))] focus:text-[hsl(var(--destructive))]"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          {tActions("revoke")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AlertDialog
        open={confirmId !== null}
        onOpenChange={(o) => !o && setConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tActions("revokeConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tActions("revokeConfirmBody", {
                email:
                  invitations.find((i) => i.id === confirmId)?.email ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {tMemberActions("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (confirmId) revoke(confirmId);
              }}
              disabled={isPending}
              className="bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:bg-[hsl(var(--destructive))]/90"
            >
              {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {tActions("revokeAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
