"use client";

import { useTranslations } from "next-intl";
import { AlertCircle, ArrowRight, Calendar, ListChecks, Receipt } from "lucide-react";

import { Money } from "@/components/money/money";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { PriorityData } from "../demo-data";

interface Props {
  data: PriorityData;
}

/**
 * Three priority cards side-by-side: top task, urgent deadline, pending
 * invoice. Mobile stacks them; desktop puts them on a 12-col grid where
 * the task takes 5 cols, deadline 4, invoice 3 — Linear-style asymmetric
 * weight reflecting how much context each card carries.
 */
export function PrioritySection({ data }: Props) {
  const t = useTranslations("Dashboard.priority");

  return (
    <section className="space-y-3">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">
            {t("title")}
          </h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {t("subtitle")}
          </p>
        </div>
      </header>

      <div className="grid gap-3 lg:grid-cols-12">
        {/* Top task */}
        <Link
          href="/tasks"
          className="group relative overflow-hidden rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--surface-1))] p-5 shadow-sm transition-all hover:border-[hsl(var(--primary))]/30 hover:shadow-md focus-ring lg:col-span-5"
        >
          <PriorityHeader
            icon={<ListChecks className="h-3.5 w-3.5" />}
            label={t("topTask")}
            tone={data.task.priority === "high" ? "danger" : "muted"}
          />
          <h3 className="mt-3 font-display text-base font-semibold leading-tight">
            {data.task.title}
          </h3>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            {data.task.client} · {data.task.project}
          </p>
          <p className="mt-4 text-[11px] font-medium text-[hsl(var(--primary))]">
            {t("dueIn", { value: data.task.dueIn })}
          </p>
          <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-[hsl(var(--muted-foreground))]/0 transition-opacity group-hover:text-[hsl(var(--foreground))]" />
        </Link>

        {/* Urgent deadline */}
        <Link
          href="/projects"
          className="group relative overflow-hidden rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--surface-1))] p-5 shadow-sm transition-all hover:border-[hsl(var(--warning))]/40 hover:shadow-md focus-ring lg:col-span-4"
        >
          <PriorityHeader
            icon={<Calendar className="h-3.5 w-3.5" />}
            label={t("urgentDeadline")}
            tone="warning"
          />
          <h3 className="mt-3 font-display text-base font-semibold leading-tight">
            {data.deadline.title}
          </h3>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            {data.deadline.client}
          </p>
          <p className="mt-4 text-[11px] font-medium text-[hsl(var(--warning))]">
            {t("daysLeft", { count: data.deadline.daysLeft })}
          </p>
        </Link>

        {/* Pending invoice */}
        <Link
          href="/invoices"
          className="group relative overflow-hidden rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--surface-1))] p-5 shadow-sm transition-all hover:border-[hsl(var(--destructive))]/30 hover:shadow-md focus-ring lg:col-span-3"
        >
          <PriorityHeader
            icon={<Receipt className="h-3.5 w-3.5" />}
            label={t("pendingInvoice")}
            tone="danger"
          />
          <p className="mt-2 font-mono text-xs text-[hsl(var(--muted-foreground))]">
            {data.invoice.number}
          </p>
          <p className="font-display text-2xl font-bold tracking-tight">
            <Money
              amount={data.invoice.amount}
              currency={data.invoice.currency}
              compact
              noTooltip
            />
          </p>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            {data.invoice.client}
          </p>
          <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[hsl(var(--destructive))]">
            <AlertCircle className="h-3 w-3" />
            {t("daysOverdue", { count: data.invoice.daysOverdue })}
          </p>
        </Link>
      </div>
    </section>
  );
}

function PriorityHeader({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "danger" | "warning" | "muted";
}) {
  const toneStyles = {
    danger:
      "border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]",
    warning:
      "border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
    muted:
      "border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] text-[hsl(var(--muted-foreground))]",
  } as const;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
        toneStyles[tone],
      )}
    >
      {icon}
      {label}
    </div>
  );
}
