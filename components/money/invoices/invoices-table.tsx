"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  Pencil,
  Send,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  markInvoicePaidAction,
  sendInvoiceAction,
  voidInvoiceAction,
} from "@/features/money/invoices/actions";
import type { InvoiceRow } from "@/features/money/types";
import type { InvoiceDisplayStatus } from "@/features/money/schemas";
import { Money } from "@/components/money/money";
import { InvoiceStatusBadge } from "./invoice-status-badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
  invoices: InvoiceRow[];
  canManage: boolean;
}

type ActionDialog =
  | { type: "send"; invoice: InvoiceRow }
  | { type: "markPaid"; invoice: InvoiceRow; paidDate: string }
  | { type: "void"; invoice: InvoiceRow }
  | null;

/**
 * Invoice table.
 *
 * - Read-only when `canManage` is false (Manager role).
 * - Draft invoices can be edited.
 * - Sent/viewed invoices can be marked paid or voided.
 * - Paid invoices can be marked unpaid (reverses the ledger sync).
 * - "overdue" is computed at render time from `dueDate` + `status` ∈ {sent, viewed}.
 */
export function InvoicesTable({ locale, invoices, canManage }: Props) {
  const tActions = useTranslations("Money.invoices.actions");

  const [dialog, setDialog] = useState<ActionDialog>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSend() {
    if (!dialog || dialog.type !== "send") return;
    const invoice = dialog.invoice;
    startTransition(async () => {
      const result = await sendInvoiceAction(invoice.id, locale);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(tActions("sent"));
      setDialog(null);
      router.refresh();
    });
  }

  function handleMarkPaid() {
    if (!dialog || dialog.type !== "markPaid") return;
    const { invoice, paidDate } = dialog;
    if (!paidDate) {
      toast.error(tActions("paidDateHint"));
      return;
    }
    startTransition(async () => {
      const result = await markInvoicePaidAction(invoice.id, paidDate, locale);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(tActions("paid"));
      setDialog(null);
      router.refresh();
    });
  }

  function handleVoid() {
    if (!dialog || dialog.type !== "void") return;
    const invoice = dialog.invoice;
    startTransition(async () => {
      const result = await voidInvoiceAction(invoice.id, locale);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(tActions("voided"));
      setDialog(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--surface-2))]/40">
              <tr className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                <th className="px-4 py-2.5 text-left">Number</th>
                <th className="px-4 py-2.5 text-left">Client</th>
                <th className="hidden px-4 py-2.5 text-left lg:table-cell">
                  Project
                </th>
                <th className="hidden px-4 py-2.5 text-left md:table-cell">
                  Issue date
                </th>
                <th className="hidden px-4 py-2.5 text-left xl:table-cell">
                  Due date
                </th>
                <th className="px-4 py-2.5 text-left">Status</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
                <th className="w-12 px-2 py-2.5 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]/60">
              {invoices.map((invoice) => {
                const displayStatus = computeDisplayStatus(invoice);
                const isDraft = invoice.status === "draft";
                const canSend = isDraft;
                const canMarkPaid =
                  invoice.status === "sent" || invoice.status === "viewed";
                const canVoid =
                  invoice.status !== "void" && invoice.status !== "paid";

                return (
                  <tr
                    key={invoice.id}
                    className="group cursor-pointer transition-colors hover:bg-[hsl(var(--surface-2))]/40"
                    onClick={() =>
                      router.push(`/${locale}/money/invoices/${invoice.id}`)
                    }
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                        <span className="font-mono text-xs font-medium">
                          {invoice.number}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="truncate font-medium leading-tight">
                        {invoice.clientLabel ?? "—"}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 text-[12px] text-[hsl(var(--muted-foreground))] lg:table-cell">
                      {invoice.projectLabel ?? "—"}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-[12px] text-[hsl(var(--muted-foreground))] md:table-cell">
                      {formatDate(invoice.issueDate, locale)}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-[12px] text-[hsl(var(--muted-foreground))] xl:table-cell">
                      {formatDate(invoice.dueDate, locale)}
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceStatusBadge status={displayStatus} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <span className="font-display text-sm font-semibold tabular-nums">
                        <Money
                          amount={invoice.total}
                          currency={invoice.currency}
                          amountUsd={invoice.totalUsd}
                          rateDate={invoice.rateDate}
                        />
                      </span>
                    </td>
                    <td
                      className="px-2 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {canManage ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--foreground))] focus:opacity-100 group-hover:opacity-100"
                              aria-label="Actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/${locale}/money/invoices/${invoice.id}`,
                                )
                              }
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </DropdownMenuItem>
                            {isDraft && (
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/${locale}/money/invoices/${invoice.id}`,
                                  )
                                }
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {canSend && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    setDialog({ type: "send", invoice })
                                  }
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  {tActions("send")}
                                </DropdownMenuItem>
                              </>
                            )}
                            {canMarkPaid && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    setDialog({
                                      type: "markPaid",
                                      invoice,
                                      paidDate: new Date()
                                        .toISOString()
                                        .slice(0, 10),
                                    })
                                  }
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  {tActions("markPaid")}
                                </DropdownMenuItem>
                              </>
                            )}
                            {canVoid && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() =>
                                    setDialog({ type: "void", invoice })
                                  }
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  {tActions("void")}
                                </DropdownMenuItem>
                              </>
                            )}
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

      {/* Send confirmation */}
      <AlertDialog
        open={dialog?.type === "send"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tActions("sendConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tActions("sendConfirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {tActions("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSend} disabled={isPending}>
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {tActions("sendAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark paid dialog */}
      <AlertDialog
        open={dialog?.type === "markPaid"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tActions("markPaid")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tActions("paidDateHint")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="paid-date">{tActions("paidDate")}</Label>
            <Input
              id="paid-date"
              type="date"
              value={
                dialog?.type === "markPaid" ? dialog.paidDate : ""
              }
              onChange={(e) => {
                if (dialog?.type === "markPaid") {
                  setDialog({ ...dialog, paidDate: e.target.value });
                }
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {tActions("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkPaid} disabled={isPending}>
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {tActions("markPaid")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Void confirmation */}
      <AlertDialog
        open={dialog?.type === "void"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tActions("voidConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tActions("voidConfirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {tActions("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVoid}
              disabled={isPending}
              className="bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:bg-[hsl(var(--destructive))]/90"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {tActions("voidAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function computeDisplayStatus(invoice: InvoiceRow): InvoiceDisplayStatus {
  if (invoice.status === "void" || invoice.status === "paid") {
    return invoice.status;
  }
  if (
    (invoice.status === "sent" || invoice.status === "viewed") &&
    new Date(invoice.dueDate) < new Date()
  ) {
    return "overdue";
  }
  return invoice.status;
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
