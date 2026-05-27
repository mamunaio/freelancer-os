"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  Building2,
  Copy,
  Edit,
  ExternalLink,
  Mail,
  MoreHorizontal,
  Pause,
  Play,
  Phone,
  Trash2,
} from "lucide-react";

import {
  deleteClientAction,
  setClientStatusAction,
} from "@/features/clients/actions";
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
import { Money } from "@/components/money/money";
import { Link } from "@/i18n/navigation";
import { ClientStatusBadge } from "./client-status-badge";
import type { ClientRow } from "@/features/clients/queries";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
  client: ClientRow;
  onEdit: () => void;
}

/**
 * Single client card on the list page. Shows contact summary, tags,
 * lifetime revenue, and a kebab menu for inline actions (edit, copy
 * portal link, pause/resume, archive).
 *
 * The card itself is a Link so the entire surface navigates to the detail
 * page. Inline interactive elements stop propagation.
 */
export function ClientCard({ locale, client, onEdit }: Props) {
  const t = useTranslations("Clients");
  const tActions = useTranslations("Clients.actions");
  const tCard = useTranslations("Clients.card");
  const router = useRouter();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const initials = (client.company ?? client.name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "·";

  function copyPortal(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/${locale}/portal/${client.portalToken}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success(tActions("portalLinkCopied")),
      () => toast.error("Couldn't copy"),
    );
  }

  function changeStatus(status: "active" | "paused" | "archived") {
    startTransition(async () => {
      const result = await setClientStatusAction(
        { id: client.id, status },
        locale,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(tActions("statusChanged"));
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteClientAction(client.id, locale);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(tActions("deleted"));
      setConfirmOpen(false);
      router.refresh();
    });
  }

  const isArchived = client.status === "archived";
  const isPaused = client.status === "paused";

  return (
    <>
      <Link
        href={`/clients/${client.id}`}
        className="group relative flex flex-col rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-4 transition-all hover:border-[hsl(var(--primary))]/30 hover:bg-[hsl(var(--surface-2))] focus-ring"
      >
        {/* Top row: avatar + status + menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] text-sm font-semibold text-[hsl(var(--primary-foreground))]">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold tracking-tight">
                {client.name}
              </p>
              <p className="flex items-center gap-1 truncate text-xs text-[hsl(var(--muted-foreground))]">
                <Building2 className="h-3 w-3 shrink-0" />
                {client.company || tCard("noCompany")}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <ClientStatusBadge status={client.status} size="xs" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded text-[hsl(var(--muted-foreground))] opacity-0 transition-all hover:bg-[hsl(var(--surface-3))] hover:text-[hsl(var(--foreground))] group-hover:opacity-100 data-[state=open]:opacity-100 focus-ring"
                  aria-label="Actions"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
                className="w-52"
              >
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    onEdit();
                  }}
                >
                  <Edit className="mr-2 h-3.5 w-3.5" />
                  {tActions("edit")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => copyPortal(e as unknown as React.MouseEvent)}>
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  {tActions("copyPortalLink")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isPaused ? (
                  <DropdownMenuItem onSelect={() => changeStatus("active")}>
                    <Play className="mr-2 h-3.5 w-3.5" />
                    {tActions("resume")}
                  </DropdownMenuItem>
                ) : !isArchived ? (
                  <DropdownMenuItem onSelect={() => changeStatus("paused")}>
                    <Pause className="mr-2 h-3.5 w-3.5" />
                    {tActions("pause")}
                  </DropdownMenuItem>
                ) : null}
                {isArchived ? (
                  <DropdownMenuItem onSelect={() => changeStatus("active")}>
                    <ArchiveRestore className="mr-2 h-3.5 w-3.5" />
                    {tActions("unarchive")}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => changeStatus("archived")}>
                    <Archive className="mr-2 h-3.5 w-3.5" />
                    {tActions("archive")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setConfirmOpen(true);
                  }}
                  className="text-[hsl(var(--destructive))] focus:text-[hsl(var(--destructive))]"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  {tActions("delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Contact info */}
        <div className="mt-4 space-y-1.5 text-xs text-[hsl(var(--muted-foreground))]">
          {client.email ? (
            <p className="flex items-center gap-1.5 truncate">
              <Mail className="h-3 w-3 shrink-0" />
              {client.email}
            </p>
          ) : (
            <p className="flex items-center gap-1.5 italic opacity-60">
              <Mail className="h-3 w-3 shrink-0" />
              {tCard("noEmail")}
            </p>
          )}
          {client.phone && (
            <p className="flex items-center gap-1.5 truncate">
              <Phone className="h-3 w-3 shrink-0" />
              {client.phone}
            </p>
          )}
        </div>

        {/* Tags */}
        {client.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {client.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[10px] font-medium text-[hsl(var(--muted-foreground))]"
              >
                {tag}
              </span>
            ))}
            {client.tags.length > 3 && (
              <span className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[10px] font-medium text-[hsl(var(--muted-foreground))]">
                +{client.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer: revenue */}
        <div className="mt-4 flex items-end justify-between border-t border-[hsl(var(--border))] pt-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
              {t("stats.lifetimeRevenue")}
            </p>
            <p className="font-display text-lg font-bold tabular-nums tracking-tight">
              <Money
                amount={client.totalRevenueUsd}
                currency="USD"
                compact
                noTooltip
              />
            </p>
          </div>
          <ExternalLink className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </Link>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tActions("deleteConfirmTitle", { name: client.name })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tActions("deleteConfirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {tActions("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                remove();
              }}
              disabled={isPending}
              className="bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:bg-[hsl(var(--destructive))]/90"
            >
              {tActions("deleteAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
