import { useMemo } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Repeat, AlertTriangle, TrendingUp } from "lucide-react";
import { fmtCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Entry = Tables<"finance_entries">;
type Category = Enums<"finance_category">;

const categoryLabel: Record<Category, string> = {
  invoice: "Invoice", freelance: "Freelance", other_income: "Other income",
  subscription: "Subscriptions", ads: "Ads", tools: "Tools", other_expense: "Other expense",
};

interface Props { entries: Entry[] }

export function RecurringExpensesCard({ entries }: Props) {
  const data = useMemo(() => {
    const recurring = entries.filter((e) => e.kind === "expense" && e.recurring !== "none");

    // Group by description+category to detect "the same" recurring item across months
    const byKey = new Map<string, Entry[]>();
    for (const e of recurring) {
      const key = `${e.description ?? ""}|${e.category}|${e.recurring}`;
      const arr = byKey.get(key) ?? [];
      arr.push(e);
      byKey.set(key, arr);
    }

    // For each group, take the most recent occurrence as the "current" version
    const items = Array.from(byKey.values()).map((group) => {
      const sorted = [...group].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));
      const current = sorted[0];
      const previous = sorted[1];
      const increased = previous && Number(current.amount) > Number(previous.amount);
      const delta = previous ? Number(current.amount) - Number(previous.amount) : 0;
      return { current, previous, increased, delta };
    });

    const monthlySum = items
      .filter((x) => x.current.recurring === "monthly")
      .reduce((s, x) => s + Number(x.current.amount), 0);
    const yearlySum = items
      .filter((x) => x.current.recurring === "yearly")
      .reduce((s, x) => s + Number(x.current.amount), 0);

    // Annual burn from recurring = monthly * 12 + yearly
    const annualBurn = monthlySum * 12 + yearlySum;
    // Monthly equivalent (for "Add to actual recent burn")
    const monthlyEquivalent = monthlySum + yearlySum / 12;

    return { items, monthlySum, yearlySum, annualBurn, monthlyEquivalent };
  }, [entries]);

  return (
    <GlassCard className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-accent/30 to-accent/0 blur-2xl" />
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-accent" />
          <h3 className="font-display text-base font-semibold">Recurring expenses</h3>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {data.items.length} item{data.items.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Monthly</p>
          <p className="mt-1 font-display text-lg font-semibold">{fmtCurrency(data.monthlySum)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Yearly</p>
          <p className="mt-1 font-display text-lg font-semibold">{fmtCurrency(data.yearlySum)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Annual burn</p>
          <p className="mt-1 font-display text-lg font-semibold gradient-text">{fmtCurrency(data.annualBurn)}</p>
        </div>
      </div>

      {data.items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border/60 py-6 text-center text-xs text-muted-foreground">
          No recurring expenses yet. Set <span className="text-foreground">Recurring → monthly/yearly</span> on an entry.
        </p>
      ) : (
        <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
          {data.items.map(({ current, increased, delta }) => (
            <div
              key={current.id}
              className={cn(
                "flex items-center justify-between rounded-md border px-2.5 py-1.5 text-xs",
                increased
                  ? "border-destructive/40 bg-destructive/10"
                  : "border-border/40 bg-secondary/30",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{current.description || categoryLabel[current.category]}</p>
                <p className="text-[10px] text-muted-foreground">
                  {categoryLabel[current.category]} · {current.recurring}
                </p>
              </div>
              <div className="ml-3 flex items-center gap-1.5 text-right">
                {increased && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-destructive">
                    <TrendingUp className="h-2.5 w-2.5" />+{fmtCurrency(delta)}
                  </span>
                )}
                <span className={cn("font-semibold tabular-nums", increased && "text-destructive")}>
                  {fmtCurrency(Number(current.amount))}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.items.some((x) => x.increased) && (
        <p className="mt-3 flex items-center gap-1.5 text-[10px] text-destructive">
          <AlertTriangle className="h-3 w-3" /> One or more recurring expenses increased vs the previous occurrence.
        </p>
      )}
    </GlassCard>
  );
}
