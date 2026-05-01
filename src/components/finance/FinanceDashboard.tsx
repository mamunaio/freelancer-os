import { useMemo } from "react";
import { GlassCard } from "@/components/GlassCard";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from "recharts";
import { fmtCurrency, fmtCurrencyDetailed } from "@/lib/format";
import { TrendingUp, TrendingDown, Sparkles, PiggyBank, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { RecurringExpensesCard } from "./RecurringExpensesCard";
import { TaxSummaryCard } from "./TaxSummaryCard";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Entry = Tables<"finance_entries">;
type Category = Enums<"finance_category">;

const categoryLabel: Record<Category, string> = {
  invoice: "Invoice", freelance: "Freelance", other_income: "Other income",
  subscription: "Subscriptions", ads: "Ads", tools: "Tools", other_expense: "Other expense",
};

const PIE_COLORS = ["hsl(226 100% 65%)", "hsl(265 90% 65%)", "hsl(190 90% 55%)", "hsl(38 95% 60%)", "hsl(0 80% 60%)", "hsl(152 76% 50%)", "hsl(290 70% 65%)"];

interface Props { entries: Entry[]; taxRate?: number }

export function FinanceDashboard({ entries, taxRate = 25 }: Props) {
  const stats = useMemo(() => {
    const now = new Date();
    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const thisMonth = monthKey(now);
    const lastMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    const sum = (rows: Entry[], k: "income" | "expense") =>
      rows.filter((r) => r.kind === k).reduce((s, r) => s + Number(r.amount), 0);

    const totalIncome = sum(entries, "income");
    const totalExpense = sum(entries, "expense");
    const net = totalIncome - totalExpense;

    const thisMonthRows = entries.filter((e) => monthKey(new Date(e.occurred_on)) === thisMonth);
    const lastMonthRows = entries.filter((e) => monthKey(new Date(e.occurred_on)) === lastMonth);
    const thisMonthIncome = sum(thisMonthRows, "income");
    const lastMonthIncome = sum(lastMonthRows, "income");
    const thisMonthExpense = sum(thisMonthRows, "expense");
    const thisMonthNet = thisMonthIncome - thisMonthExpense;

    const incomeDelta = lastMonthIncome === 0 ? (thisMonthIncome > 0 ? 100 : 0) : ((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100;

    // Last 6 months series
    const months: { label: string; income: number; expense: number; net: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = monthKey(d);
      const rows = entries.filter((e) => monthKey(new Date(e.occurred_on)) === k);
      const inc = sum(rows, "income");
      const exp = sum(rows, "expense");
      months.push({
        label: d.toLocaleDateString("en-US", { month: "short" }),
        income: inc, expense: exp, net: inc - exp,
      });
    }

    // Category breakdown
    const expByCat = new Map<Category, number>();
    const incByCat = new Map<Category, number>();
    for (const e of entries) {
      const map = e.kind === "income" ? incByCat : expByCat;
      map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
    }
    const expenseBreakdown = Array.from(expByCat.entries())
      .map(([k, v]) => ({ name: categoryLabel[k], value: v }))
      .sort((a, b) => b.value - a.value);
    const incomeBreakdown = Array.from(incByCat.entries())
      .map(([k, v]) => ({ name: categoryLabel[k], value: v }))
      .sort((a, b) => b.value - a.value);

    const margin = totalIncome > 0 ? (net / totalIncome) * 100 : 0;
    const burnRate = months.slice(-3).reduce((s, m) => s + m.expense, 0) / 3;
    const runway = burnRate > 0 ? net / burnRate : Infinity;

    return {
      totalIncome, totalExpense, net,
      thisMonthIncome, thisMonthExpense, thisMonthNet, incomeDelta,
      months, expenseBreakdown, incomeBreakdown, margin, burnRate, runway,
    };
  }, [entries]);

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <GlassCard className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-success/30 to-success/0 blur-2xl" />
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">This month income</p>
          <p className="mt-2 font-display text-2xl font-semibold">{fmtCurrency(stats.thisMonthIncome)}</p>
          <p className={cn("mt-1 flex items-center gap-1 text-[11px]", stats.incomeDelta >= 0 ? "text-success" : "text-destructive")}>
            {stats.incomeDelta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {stats.incomeDelta >= 0 ? "+" : ""}{stats.incomeDelta.toFixed(1)}% vs last month
          </p>
        </GlassCard>
        <GlassCard className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-destructive/30 to-destructive/0 blur-2xl" />
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">This month expense</p>
          <p className="mt-2 font-display text-2xl font-semibold">{fmtCurrency(stats.thisMonthExpense)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Burn ~{fmtCurrency(stats.burnRate)}/mo</p>
        </GlassCard>
        <GlassCard className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-primary/30 to-accent/0 blur-2xl" />
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">This month net</p>
          <p className={cn("mt-2 font-display text-2xl font-semibold", stats.thisMonthNet >= 0 ? "gradient-text" : "text-destructive")}>
            {fmtCurrency(stats.thisMonthNet)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Income − Expenses</p>
        </GlassCard>
        <GlassCard className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-accent/30 to-accent/0 blur-2xl" />
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Profit margin</p>
          <p className="mt-2 font-display text-2xl font-semibold">{stats.margin.toFixed(1)}%</p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Activity className="h-3 w-3" /> All time
          </p>
        </GlassCard>
      </div>

      {/* Trend chart */}
      <GlassCard>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cash flow</p>
            <h3 className="font-display text-lg font-semibold">Last 6 months</h3>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" />Income</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" />Expense</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Net</span>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <AreaChart data={stats.months} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="g-inc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(152 76% 50%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(152 76% 50%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g-exp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(0 80% 60%)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(0 80% 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} stroke="hsl(var(--border))" />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} stroke="hsl(var(--border))" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                formatter={(v: number) => fmtCurrency(v)}
              />
              <Area type="monotone" dataKey="income" stroke="hsl(152 76% 50%)" fill="url(#g-inc)" strokeWidth={2} />
              <Area type="monotone" dataKey="expense" stroke="hsl(0 80% 60%)" fill="url(#g-exp)" strokeWidth={2} />
              <Area type="monotone" dataKey="net" stroke="hsl(var(--primary))" fill="transparent" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Breakdowns */}
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-success" />
            <h3 className="font-display text-base font-semibold">Income by category</h3>
          </div>
          {stats.incomeBreakdown.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No income yet</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={stats.incomeBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                    {stats.incomeBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number) => fmtCurrency(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>
        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-destructive" />
            <h3 className="font-display text-base font-semibold">Expense by category</h3>
          </div>
          {stats.expenseBreakdown.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No expenses yet</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={stats.expenseBreakdown} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} stroke="hsl(var(--border))" />
                  <YAxis dataKey="name" type="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} stroke="hsl(var(--border))" width={90} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number) => fmtCurrencyDetailed(v)}
                  />
                  <Bar dataKey="value" fill="hsl(var(--destructive))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Recurring + Tax */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RecurringExpensesCard entries={entries} />
        <TaxSummaryCard entries={entries} taxRate={taxRate} />
      </div>
    </div>
  );
}
