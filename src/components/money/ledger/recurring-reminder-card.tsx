"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, Loader2, Repeat2 } from "lucide-react";
import { toast } from "sonner";

import { dismissReminderAction } from "@/features/money/ledger/actions";
import type { RecurringReminderRow } from "@/features/money/ledger/queries";
import { Money } from "@/components/money/money";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
  reminders: RecurringReminderRow[];
  /** Click handler for "Log again" — opens the form pre-filled with the
   *  source reminder. The orchestrator owns the dialog state. */
  onLogAgain: (reminder: RecurringReminderRow) => void;
}

/**
 * Banner of recurring reminders due in the next 14 days.
 *
 * Recurring expenses never auto-post (locked product decision). Each card
 * is a nudge: either the user clicks "Log again" to re-create the entry
 * for the new cycle, or "I logged it" to push the reminder forward without
 * creating a row.
 */
export function RecurringReminderCard({
  locale,
  reminders,
  onLogAgain,
}: Props) {
  const t = useTranslations("Money.ledger.reminders");
  const tActions = useTranslations("Money.ledger.actions");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (reminders.length === 0) return null;

  function handleDismiss(id: string) {
    startTransition(async () => {
      const result = await dismissReminderAction(id, locale);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(tActions("reminderDismissed"));
      router.refresh();
    });
  }

  return (
    <section
      aria-label={t("title")}
      className="rounded-2xl border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/8 p-4"
    >
      <header className="mb-3 flex items-center gap-2 text-[hsl(var(--warning))]">
        <Bell className="h-3.5 w-3.5" />
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em]">
          {t("title")}
        </h2>
      </header>
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {reminders.map((r) => (
          <li
            key={r.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-3"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                <Repeat2 className="h-3 w-3" />
                {r.cadence === "yearly" ? t("yearly") : t("monthly")}
              </p>
              <p className="mt-1 truncate text-sm font-medium">
                {r.description?.trim() || r.category}
              </p>
              <p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                {t("dueRelative", { value: relative(r.nextReminderAt) })}
              </p>
              <p className="mt-1 font-display text-sm font-semibold tabular-nums">
                <Money
                  amount={r.amount}
                  currency={r.currency}
                  amountUsd={r.amountUsd}
                />
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-1.5">
              <button
                type="button"
                onClick={() => onLogAgain(r)}
                disabled={isPending}
                className="rounded-md bg-[hsl(var(--primary))] px-2.5 py-1 text-[11px] font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("logAgain")}
              </button>
              <button
                type="button"
                onClick={() => handleDismiss(r.id)}
                disabled={isPending}
                className="inline-flex items-center justify-center gap-1 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-2.5 py-1 text-[11px] font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                {t("dismiss")}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Small, locale-agnostic "in 3 days / yesterday" helper. We intentionally
 * skip Intl.RelativeTimeFormat for now to keep the bn copy reading
 * naturally — month / day strings are translated upstream.
 */
function relative(iso: string): string {
  const target = new Date(iso);
  const now = new Date();
  const ms = target.getTime() - now.getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "in 1 day";
  if (days < 7) return `in ${days} days`;
  if (days < 14) return "next week";
  return target.toISOString().slice(0, 10);
}
