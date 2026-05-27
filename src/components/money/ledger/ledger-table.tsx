"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Pencil,
  Repeat2,
  Shield,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { deleteFinanceEntryAction } from "@/features/money/ledger/actions";
import type { FinanceEntryRow } from "@/features/money/types";
import { Money } from "@/components/money/money";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
  entries: FinanceEntryRow[];
  canManage: boolean;
  onEdit: (entry: FinanceEntryRow) => void;
}

/**
 * Ledger table.
 *
 * - Read-only when `canManage` is false (Manager role).
 * - Synced rows (`source === "invoice"`) suppress the edit/delete actions
 *   and show a tooltip on the row badge directing the user to the invoice.
 * - Soft delete is the only delete path — entries get a `deletedAt` stamp
 *   and disappear from queries but reports remain consistent historically.
 */
export function LedgerTable({ locale, entries, canManage, onEdit }: Props) {
  const t = useTranslations("Money.ledger.table");
  const tActions = useTranslations("Money.ledger.actions");
  const tReminders = useTranslations("Money.ledger.reminders");

  const [pendingDelete, setPendingDelete] = useState<FinanceEntryRow | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!pendingDelete) return;
    const entry = pendingDelete;
    startTransition(async () => {
      const result = await deleteFinanceEntryAction(entry.id, locale);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(tActions("deleted"));
      setPendingDelete(null);
      router.refresh();
    });
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-2))]/40">
              <tr className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                <th className="px-4 py-2.5 text-left">{t("date")}</th>
                <th className="px-4 py-2.5 text-left">{t("description")}</th>
                <th className="hidden px-4 py-2.5 text-left lg:table-cell">
                  {t("client")}
                </th>
                <th className="hidden px-4 py-2.5 text-left xl:table-cell">
                  {t("project")}
                </th>
                <th className="hidden px-4 py-2.5 text-left md:table-cell">
                  {t("category")}
                </th>
                <th className="px-4 py-2.5 text-right">{t("amount")}</th>
                <th className="w-12 px-2 py-2.5 text-right">
                  <span className="sr-only">{t("actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]/60">
              {entries.map((entry) => {
                const synced = entry.source === "invoice";
                const recurring = entry.recurring.cadence !== "none";
                return (
                  <tr
                    key={entry.id}
                    className="group transition-colors hover:bg-[hsl(var(--surface-2))]/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-[12px] text-[hsl(var(--muted-foreground))]">
                      {formatDate(entry.occurredOn, locale)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <span
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
                            entry.kind === "income"
                              ? "bg-[hsl(var(--success))]/12 text-[hsl(var(--success))]"
                              : "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]",
                          )}
                          aria-hidden="true"
                        >
                          {entry.kind === "income" ? (
                            <ArrowDownLeft className="h-3 w-3" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium leading-tight">
                            {entry.description?.trim() || entry.category}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className="inline-flex items-center gap-1 rounded border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] px-1.5 py-0.5 text-[hsl(var(--muted-foreground))] md:hidden">
                              {entry.category}
                            </span>
                            {entry.taxDeductible && (
                              <span className="inline-flex items-center gap-1 rounded border border-[hsl(var(--info))]/30 bg-[hsl(var(--info))]/10 px-1.5 py-0.5 font-medium text-[hsl(var(--info))]">
                                <Shield className="h-2.5 w-2.5" />
                                {t("deductibleBadge")}
                              </span>
                            )}
                            {recurring && (
                              <span className="inline-flex items-center gap-1 rounded border border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/8 px-1.5 py-0.5 font-medium text-[hsl(var(--primary))]">
                                <Repeat2 className="h-2.5 w-2.5" />
                                {entry.recurring.cadence === "yearly"
                                  ? tReminders("yearly")
                                  : tReminders("monthly")}
                              </span>
                            )}
                            {synced && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex cursor-help items-center gap-1 rounded border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-1.5 py-0.5 font-medium text-[hsl(var(--muted-foreground))]">
                                    <ExternalLink className="h-2.5 w-2.5" />
                                    Invoice
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-[240px] text-[11px]">
                                    {t("syncedTooltip", {
                                      number: entry.invoiceId ?? "—",
                                    })}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-[12px] text-[hsl(var(--muted-foreground))] lg:table-cell">
                      {entry.clientLabel ?? t("noClient")}
                    </td>
                    <td className="hidden px-4 py-3 text-[12px] text-[hsl(var(--muted-foreground))] xl:table-cell">
                      {entry.projectLabel ?? "—"}
                    </td>
                    <td className="hidden px-4 py-3 text-[12px] text-[hsl(var(--muted-foreground))] md:table-cell">
                      {entry.category}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <span
                        className={cn(
                          "font-display text-sm font-semibold tabular-nums",
                          entry.kind === "income"
                            ? "text-[hsl(var(--success))]"
                            : "text-[hsl(var(--foreground))]",
                        )}
                      >
                        {entry.kind === "expense" && "-"}
                        <Money
                          amount={entry.amount}
                          currency={entry.currency}
                          amountUsd={entry.amountUsd}
                          rateDate={entry.rateDate}
                        />
                      </span>
                    </td>
                    <td className="px-2 py-3 text-right">
                      {canManage && !synced ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--foreground))] focus:opacity-100 group-hover:opacity-100"
                              aria-label={t("actions")}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => onEdit(entry)}>
                              <Pencil className="h-3.5 w-3.5" />
                              {tActions("edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setPendingDelete(entry)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {tActions("delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tActions("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tActions("deleteConfirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {tActions("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:bg-[hsl(var(--destructive))]/90"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {tActions("deleteAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

function formatDate(iso: string, locale: Locale): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  } catch {
    return iso.slice(0, 10);
  }
}
