"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Edit,
  ExternalLink,
  MoreHorizontal,
  Trash2,
  UserCircle2,
} from "lucide-react";

import {
  convertLeadToClientAction,
  deleteLeadAction,
} from "@/features/leads/actions";
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
import { Link, useRouter as useLocaleRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { LeadRow } from "@/features/leads/queries";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
  lead: LeadRow;
  /** Drag-handle props from dnd-kit useSortable. */
  dragHandleProps?: {
    attributes?: Record<string, unknown>;
    listeners?: Record<string, unknown>;
    isDragging?: boolean;
  };
  onEdit: () => void;
}

/**
 * Lead card — compact, kanban-friendly.
 *
 * - Whole card is clickable (opens edit) — but we route through `onEdit` so
 *   the parent owns the dialog state.
 * - Drag handle wraps the top row only, leaving the body clickable.
 * - Kebab menu offers edit / convert-to-client / delete with role gates.
 */
export function LeadCard({ locale, lead, dragHandleProps, onEdit }: Props) {
  const t = useTranslations("Leads.card");
  const tActions = useTranslations("Leads.actions");
  const format = useFormatter();
  const router = useRouter();
  const localeRouter = useLocaleRouter();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const dragging = dragHandleProps?.isDragging ?? false;
  const isConverted = Boolean(lead.convertedClientId);

  function convert() {
    startTransition(async () => {
      const result = await convertLeadToClientAction(lead.id, locale);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(tActions("converted"));
      localeRouter.push(`/clients/${result.data.clientId}`);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteLeadAction(lead.id, locale);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(tActions("deleted"));
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <article
        className={cn(
          "group flex flex-col gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-3 transition-all hover:border-[hsl(var(--primary))]/30 hover:bg-[hsl(var(--surface-2))]",
          dragging && "rotate-1 shadow-[var(--shadow-elegant)] ring-1 ring-[hsl(var(--primary))]/30",
        )}
      >
        {/* Drag handle row */}
        <div
          {...(dragHandleProps?.attributes ?? {})}
          {...(dragHandleProps?.listeners ?? {})}
          className="flex cursor-grab items-start justify-between gap-2 active:cursor-grabbing"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">
              {lead.name}
            </p>
            <p className="flex items-center gap-1 truncate text-[11px] text-[hsl(var(--muted-foreground))]">
              <Building2 className="h-2.5 w-2.5 shrink-0" />
              {lead.company || "Independent"}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity hover:bg-[hsl(var(--surface-3))] hover:text-[hsl(var(--foreground))] group-hover:opacity-100 data-[state=open]:opacity-100 focus-ring"
                aria-label="Actions"
              >
                <MoreHorizontal className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
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
              {!isConverted && lead.stage === "won" && (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    convert();
                  }}
                  className="text-[hsl(var(--success))] focus:text-[hsl(var(--success))]"
                >
                  <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                  {tActions("convert")}
                </DropdownMenuItem>
              )}
              {isConverted && (
                <DropdownMenuItem asChild>
                  <Link
                    href={`/clients/${lead.convertedClientId}`}
                    className="cursor-pointer"
                  >
                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                    {tActions("viewClient")}
                  </Link>
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

        {/* Value */}
        <div className="flex items-baseline justify-between">
          <p className="font-display text-base font-bold tabular-nums tracking-tight">
            {lead.estimatedAmount > 0 ? (
              <Money
                amount={lead.estimatedAmount}
                currency={lead.estimatedCurrency}
                amountUsd={lead.estimatedAmountUsd}
                rateDate={lead.estimatedRateDate ?? undefined}
                compact
              />
            ) : (
              <span className="text-[11px] font-medium italic text-[hsl(var(--muted-foreground))]/70">
                {t("noValue")}
              </span>
            )}
          </p>
          {isConverted && (
            <span className="inline-flex items-center gap-1 rounded border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[hsl(var(--success))]">
              <CheckCircle2 className="h-2.5 w-2.5" />
              {t("converted")}
            </span>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between gap-2 text-[10px] text-[hsl(var(--muted-foreground))]">
          <span className="flex min-w-0 items-center gap-1">
            <UserCircle2 className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">
              {lead.owner?.name ?? lead.owner?.email ?? t("noOwner")}
            </span>
          </span>
          {lead.nextActionAt && (
            <span className="flex shrink-0 items-center gap-1">
              <ArrowRight className="h-2.5 w-2.5" />
              {format.dateTime(new Date(lead.nextActionAt), {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>
      </article>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
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
