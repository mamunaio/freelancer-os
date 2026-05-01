import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GlassCard } from "@/components/GlassCard";
import {
  Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ChartCardSkeleton } from "@/components/dashboard/Skeletons";
import { supabase } from "@/integrations/supabase/client";
import { fmtCurrencyDetailed, fmtCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

type Range = "1M" | "3M" | "6M" | "1Y";
const RANGE_MONTHS: Record<Range, number> = { "1M": 1, "3M": 3, "6M": 6, "1Y": 12 };

type Point = { month: string; revenue: number };

const buildSeries = (
  entries: { amount: number; occurred_on: string; kind: string }[],
  months: number,
): Point[] => {
  const out: Point[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      month: d.toLocaleDateString("en-US", { month: "short" }),
      revenue: 0,
    });
  }
  for (const e of entries) {
    if (e.kind !== "income") continue;
    const d = new Date(e.occurred_on);
    const idx =
      months - 1 -
      ((now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()));
    if (idx >= 0 && idx < months) out[idx].revenue += Number(e.amount);
  }
  return out;
};

export function RevenueChart() {
  const [range, setRange] = useState<Range>("6M");

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "revenue"],
    queryFn: async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - 11);
      since.setDate(1);
      const { data, error } = await supabase
        .from("finance_entries")
        .select("amount, occurred_on, kind")
        .gte("occurred_on", since.toISOString().slice(0, 10));
      if (error) throw error;
      return data;
    },
  });

  const { series, total, avg, delta, prev } = useMemo(() => {
    const months = RANGE_MONTHS[range];
    const series = buildSeries(data ?? [], months);
    const total = series.reduce((s, p) => s + p.revenue, 0);
    const nonZero = series.filter((p) => p.revenue > 0);
    const avg = nonZero.length > 0 ? total / nonZero.length : 0;
    const last = series[series.length - 1]?.revenue ?? 0;
    const prev = series[series.length - 2]?.revenue ?? 0;
    const delta = prev > 0 ? ((last - prev) / prev) * 100 : 0;
    return { series, total, avg, delta, prev };
  }, [data, range]);

  if (isLoading) return <ChartCardSkeleton />;

  return (
    <GlassCard className="h-full">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Revenue Overview
          </p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-2.5">
            <p className="font-display text-[28px] font-bold leading-none tracking-tight">
              {fmtCurrencyDetailed(total)}
            </p>
            {prev > 0 && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  delta >= 0
                    ? "bg-success/15 text-success"
                    : "bg-destructive/15 text-destructive",
                )}
              >
                {delta >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" strokeWidth={2.6} />
                ) : (
                  <ArrowDownRight className="h-3 w-3" strokeWidth={2.6} />
                )}
                {delta >= 0 ? "+" : ""}
                {delta.toFixed(1)}% MoM
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Avg per active month · {fmtCurrency(avg)}
          </p>
        </div>

        {/* period tabs */}
        <div className="inline-flex rounded-lg border border-border/60 bg-secondary/40 p-0.5">
          {(["1M", "3M", "6M", "1Y"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                range === r
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="revStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--accent))" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 6" vertical={false} />
            <XAxis
              dataKey="month"
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
              tickFormatter={(v) => (v >= 1000 ? `$${v / 1000}k` : `$${v}`)}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 12,
                fontSize: 12,
              }}
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
              formatter={(v: number) => [fmtCurrencyDetailed(v), "Revenue"]}
            />
            {avg > 0 && (
              <ReferenceLine
                y={avg}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                strokeOpacity={0.6}
                label={{
                  value: `Avg ${fmtCurrency(avg)}`,
                  position: "right",
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 10,
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="url(#revStroke)"
              strokeWidth={2.5}
              fill="url(#revGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
