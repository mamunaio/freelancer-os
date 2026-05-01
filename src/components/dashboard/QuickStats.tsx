import { useQuery } from "@tanstack/react-query";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { fmtCurrency } from "@/lib/format";
import { FileText, AlertCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuickStats() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "quick-stats"],
    queryFn: async () => {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 6);
      const weekStartStr = weekStart.toISOString().slice(0, 10);

      const [pendingInv, overdueTasks, weekIncome] = await Promise.all([
        supabase
          .from("invoices")
          .select("id, amount, tax_rate")
          .in("status", ["draft", "sent", "overdue"]),
        supabase
          .from("tasks")
          .select("id")
          .eq("done", false)
          .lt("due_date", todayStr),
        supabase
          .from("finance_entries")
          .select("amount, kind")
          .eq("kind", "income")
          .gte("occurred_on", weekStartStr),
      ]);

      const pendingCount = pendingInv.data?.length ?? 0;
      const pendingAmount = (pendingInv.data ?? []).reduce(
        (s: number, i: any) =>
          s + Number(i.amount ?? 0) * (1 + Number(i.tax_rate ?? 0) / 100),
        0,
      );
      const overdueCount = overdueTasks.data?.length ?? 0;
      const weekRevenue = (weekIncome.data ?? []).reduce(
        (s: number, e: any) => s + Number(e.amount ?? 0),
        0,
      );

      return { pendingCount, pendingAmount, overdueCount, weekRevenue };
    },
  });

  const items = [
    {
      icon: FileText,
      label: "Pending Invoices",
      value: isLoading ? "…" : String(data?.pendingCount ?? 0),
      sub: isLoading ? "" : fmtCurrency(data?.pendingAmount ?? 0),
      iconCls: "bg-primary/15 text-primary",
      valueCls: "",
    },
    {
      icon: AlertCircle,
      label: "Overdue Tasks",
      value: isLoading ? "…" : String(data?.overdueCount ?? 0),
      sub: data && data.overdueCount > 0 ? "Needs attention" : "All clear",
      iconCls: data && data.overdueCount > 0 ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success",
      valueCls: data && data.overdueCount > 0 ? "text-destructive" : "",
    },
    {
      icon: TrendingUp,
      label: "This Week's Revenue",
      value: isLoading ? "…" : fmtCurrency(data?.weekRevenue ?? 0),
      sub: "Last 7 days",
      iconCls: "bg-success/15 text-success",
      valueCls: "",
    },
  ];

  return (
    <GlassCard>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Quick Stats
      </p>

      <div className="space-y-2.5">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div
              key={it.label}
              className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/20 p-3 transition-colors hover:bg-primary/[0.04]"
            >
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", it.iconCls)}>
                <Icon className="h-4 w-4" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {it.label}
                </p>
                <p className={cn("font-display text-lg font-bold leading-tight tabular-nums", it.valueCls)}>
                  {it.value}
                </p>
                {it.sub && <p className="text-[10px] text-muted-foreground">{it.sub}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
