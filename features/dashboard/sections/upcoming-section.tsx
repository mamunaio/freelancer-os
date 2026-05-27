"use client";

import { useTranslations } from "next-intl";
import { Calendar, CheckSquare, Receipt, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import type { UpcomingData } from "../demo-data";

interface Props {
  data: UpcomingData;
}

const KIND_ICON = {
  task: CheckSquare,
  deadline: Calendar,
  meeting: Users,
  invoice: Receipt,
} as const;

const KIND_TINT = {
  task: "text-[hsl(var(--primary))]",
  deadline: "text-[hsl(var(--warning))]",
  meeting: "text-[hsl(var(--info))]",
  invoice: "text-[hsl(var(--success))]",
} as const;

/**
 * Horizontal calendar strip — 7 days starting today. Items grouped by day,
 * each tagged with kind + appropriate icon.
 */
export function UpcomingSection({ data }: Props) {
  const t = useTranslations("Dashboard.upcoming");

  return (
    <section className="space-y-3">
      <header>
        <h2 className="font-display text-lg font-semibold tracking-tight">
          {t("title")}
        </h2>
      </header>

      <div className="overflow-x-auto pb-1">
        <ul className="grid auto-cols-[minmax(180px,1fr)] grid-flow-col gap-3 md:auto-cols-fr md:grid-cols-7">
          {data.days.map((day, index) => (
            <li
              key={day.date}
              className={cn(
                "flex flex-col rounded-xl border p-3",
                index === 0
                  ? "border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/5"
                  : "border-[hsl(var(--border))] bg-[hsl(var(--surface-1))]",
              )}
            >
              <div className="flex items-baseline justify-between">
                <p
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-[0.16em]",
                    index === 0
                      ? "text-[hsl(var(--primary))]"
                      : "text-[hsl(var(--muted-foreground))]",
                  )}
                >
                  {index === 0 ? t("today") : day.weekday}
                </p>
                <p className="font-display text-base font-bold tabular-nums">
                  {day.day}
                </p>
              </div>

              {day.items.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {day.items.map((item) => {
                    const Icon = KIND_ICON[item.kind];
                    return (
                      <li
                        key={item.id}
                        className="flex items-start gap-1.5 rounded-md bg-[hsl(var(--surface-2))] px-2 py-1.5"
                      >
                        <Icon
                          className={cn(
                            "mt-0.5 h-3 w-3 shrink-0",
                            KIND_TINT[item.kind],
                          )}
                        />
                        <span className="text-[11px] leading-tight">
                          {item.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-[11px] italic text-[hsl(var(--muted-foreground))]/60">
                  {t("noItems")}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
