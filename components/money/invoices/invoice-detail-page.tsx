"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
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
  markInvoiceUnpaidAction,
  sendInvoiceAction,
  voidInvoiceAction,
} from "@/features/money/invoices/actions";
import type { InvoiceRow } from "@/features/money/types";
import type { InvoiceDisplayStatus } from "@/features/money/schemas";
import { Money } from "@/components/money/money";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import { InvoiceFormPage } from "./invoice-form-page";
import { Button } from "@/components/ui/button";
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

interface ClientOption {
  id: string;
  name: string;
  company: string | null;
}
interface ProjectOption {
  id: string;
  name: string;
  clientLabel: string | null;
}

interface Props {
  locale: Locale;
  invoice: InvoiceRow;
  clients: ClientOption[];
  projects: ProjectOption[];
  defaultCurrency: "USD" | "BDT";
  defaultTaxRate: number;
  canManage: boolean;
}

type ActionDialog =
  | { type: "send" }
  | { type: "markPaid"; paidDate: string }
  | { type: "markUnpaid" }
  | { type: "void" }
  | null;

/**
 * Invoice detail page.
 *
 * - Draft: show edit form inline
 * - Sent/viewed/paid/void: show read-only view with status timeline + actions
 */
export function InvoiceDetailPage({
  locale,
  invoice,
  clients,
  projects,
  defaultCurrency,
  defaultTaxRate,
  canManage,
}: Props) {
  const tActions = useTranslations("Money.invoices.actions");
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [dialog, setDialog] = useState<ActionDialog>(null);
  const [isPending, startTransition] = useTransition();

  const isDraft = invoice.status === "draft";
  const displayStatus = computeDisplayStatus(invoice);

  function handleSend() {
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
    const { paidDate } = dialog;
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

  function handleMarkUnpaid() {
    startTransition(async () => {
      const result = await markInvoiceUnpaidAction(invoice.id, locale);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(tActions("unpaid"));
      setDialog(null);
      router.refresh();
    });
  }

  function handleVoid() {
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

  // If draft and editing, show the form
  if (isDraft && isEditing) {
    return (
      <InvoiceFormPage
        locale={locale}
        mode="edit"
        clients={clients}
        projects={projects}
        defaultCurrency={defaultCurrency}
        defaultTaxRate={defaultTaxRate}
        invoice={invoice}
      />
    );
  }

  return (
    <>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/${locale}/money/invoices`)}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-xl font-semibold">
                  {invoice.number}
                </h1>
                <InvoiceStatusBadge status={displayStatus} />
              </div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {invoice.clientLabel}
              </p>
            </div>
          </div>

          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {isDraft && (
                  <>
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setDialog({ type: "send" })}>
                      <Send className="h-3.5 w-3.5" />
                      {tActions("send")}
                    </DropdownMenuItem>
                  </>
                )}
                {(invoice.status === "sent" || invoice.status === "viewed") && (
                  <>
                    <DropdownMenuItem
                      onClick={() =>
                        setDialog({
                          type: "markPaid",
                          paidDate: new Date().toISOString().slice(0, 10),
                        })
                      }
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {tActions("markPaid")}
                    </DropdownMenuItem>
                  </>
                )}
                {invoice.status === "paid" && (
                  <>
                    <DropdownMenuItem
                      onClick={() => setDialog({ type: "markUnpaid" })}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      {tActions("markUnpaid")}
                    </DropdownMenuItem>
                  </>
                )}
                {invoice.status !== "void" && invoice.status !== "paid" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDialog({ type: "void" })}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      {tActions("void")}
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    window.open(
                      `/${locale}/money/invoices/${invoice.id}/pdf`,
                      "_blank",
                    )
                  }
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Status timeline */}
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Timeline
          </h2>
          <div className="space-y-3">
            <TimelineItem
              icon={FileText}
              label="Created"
              date={invoice.createdAt}
              locale={locale}
            />
            {invoice.sentAt && (
              <TimelineItem
                icon={Send}
                label="Sent"
                date={invoice.sentAt}
                locale={locale}
              />
            )}
            {invoice.viewedAt && (
              <TimelineItem
                icon={Eye}
                label="Viewed"
                date={invoice.viewedAt}
                locale={locale}
              />
            )}
            {invoice.paidDate && (
              <TimelineItem
                icon={CheckCircle2}
                label="Paid"
                date={invoice.paidDate}
                locale={locale}
              />
            )}
            {invoice.voidedAt && (
              <TimelineItem
                icon={XCircle}
                label="Voided"
                date={invoice.voidedAt}
                locale={locale}
              />
            )}
          </div>
        </div>

        {/* Invoice details */}
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Client
              </p>
              <p className="mt-1 font-medium">{invoice.clientLabel}</p>
            </div>
            {invoice.projectLabel && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Project
                </p>
                <p className="mt-1 font-medium">{invoice.projectLabel}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Issue date
              </p>
              <p className="mt-1 font-medium">
                {formatDate(invoice.issueDate, locale)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Due date
              </p>
              <p className="mt-1 font-medium">
                {formatDate(invoice.dueDate, locale)}
              </p>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Line items
          </h2>
          <div className="space-y-2">
            {invoice.items.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))]/40 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.description}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {item.quantity} × {invoice.currency} {item.unitPrice.toFixed(2)}
                  </p>
                </div>
                <p className="font-display text-sm font-semibold tabular-nums">
                  {invoice.currency} {item.lineTotal.toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-4 space-y-2 border-t border-[hsl(var(--border))] pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[hsl(var(--muted-foreground))]">Subtotal</span>
              <span className="font-medium tabular-nums">
                {invoice.currency} {invoice.subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[hsl(var(--muted-foreground))]">
                Tax ({invoice.taxRateOverride ?? defaultTaxRate}%)
              </span>
              <span className="font-medium tabular-nums">
                {invoice.currency} {invoice.tax.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-[hsl(var(--border))] pt-2">
              <span className="font-semibold">Total</span>
              <span className="font-display text-xl font-semibold tabular-nums">
                <Money
                  amount={invoice.total}
                  currency={invoice.currency}
                  amountUsd={invoice.totalUsd}
                  rateDate={invoice.rateDate}
                />
              </span>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        {(invoice.notes || invoice.terms) && (
          <div className="grid gap-6 sm:grid-cols-2">
            {invoice.notes && (
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-6">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Notes
                </h2>
                <p className="whitespace-pre-wrap text-sm">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-6">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Terms
                </h2>
                <p className="whitespace-pre-wrap text-sm">{invoice.terms}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
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
              value={dialog?.type === "markPaid" ? dialog.paidDate : ""}
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

      <AlertDialog
        open={dialog?.type === "markUnpaid"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tActions("markUnpaid")}</AlertDialogTitle>
            <AlertDialogDescription>
              This will reverse the payment and remove the synced ledger entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {tActions("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkUnpaid} disabled={isPending}>
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {tActions("markUnpaid")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

function TimelineItem({
  icon: Icon,
  label,
  date,
  locale,
}: {
  icon: React.ElementType;
  label: string;
  date: string;
  locale: Locale;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))]/10">
        <Icon className="h-4 w-4 text-[hsl(var(--primary))]" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          {formatDate(date, locale)}
        </p>
      </div>
    </div>
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
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso.slice(0, 10);
  }
}
