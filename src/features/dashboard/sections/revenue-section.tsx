"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Money } from "@/components/money/money";
import { formatMoneyCompact } from "@/lib/currency/format";
import { cn } from "@/lib/utils";
import type { RevenueData } from "../demo-data";

interface Props {
  data: RevenueData;
}

/**
 * Six-month revenue chart with month-to-date overlay.
 *
 * Recharts SSR-renders just fine, but to avoid hydration of a randomly
 * sized container we wrap it in `ResponsiveContainer` and use deterministic
 * data (no Math.random in the dataset).
 */
export function RevenueSection({ data }: Props) {
  const t = useTranslations("Dashboard.revenue");

  const chartData = useMemo(
    () =>
      data.months.map((m) => ({
        label: m.label,
        income: m.revenue,
        expense: m.expense,
      })),
    [data.months],
  );

  const positive = data.monthToDateChangePct >= 0;

  return (
    <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-5">
      <header className="flex flex-wrap items-end justify-between gap-3 pb-4">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            {t("title")}
          </h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex flex-col gap-0.5 text-right">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
            {t("monthToDate")}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="font-display text-2xl font-bold tabular-nums tracking-tight">
              <Money
                amount={data.monthToDate}
                currency={data.currency}
                compact
                noTooltip
              />
            </p>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-[11px] font-medium",
                positive
                  ? "text-[hsl(var(--success))]"
                  : "text-[hsl(var(--destructive))]",
              )}
            >
              {positive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(data.monthToDateChangePct)}%
            </span>
          </div>
        </div>
      </header>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
          >
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0.35}
                />
                <stop
                  offset="100%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="hsl(var(--muted-foreground))"
                  stopOpacity={0.18}
                />
                <stop
                  offset="100%"
                  stopColor="hsl(var(--muted-foreground))"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="label"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) =>
                formatMoneyCompact(Number(v), data.currency).replace(
                  /\D*\d+,?\d*/,
                  (m) => m,
                )
              }
              width={60}
            />
            <Tooltip
              cursor={{
                stroke: "hsl(var(--border-strong))",
                strokeDasharray: "3 3",
              }}
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
                color: "hsl(var(--foreground))",
              }}
              labelStyle={{
                color: "hsl(var(--muted-foreground))",
                marginBottom: 4,
              }}
              formatter={(value: number, name: string) => [
                formatMoneyCompact(value, data.currency),
                name === "income" ? t("income") : t("expense"),
              ]}
            />

            <Area
              type="monotone"
              dataKey="income"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#incomeGradient)"
            />
            <Area
              type="monotone"
              dataKey="expense"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              fill="url(#expenseGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-[hsl(var(--border))] pt-3 text-[11px] text-[hsl(var(--muted-foreground))]">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />
          {t("income")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--muted-foreground))]/60" />
          {t("expense")}
        </span>
        <span>
          {t("yearToDate")}{" "}
          <Money
            amount={data.yearToDate}
            currency={data.currency}
            compact
            noTooltip
          />
        </span>
      </div>
    </section>
  );
}
