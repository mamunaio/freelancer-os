import { useMemo } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Receipt, Calendar as CalendarIcon } from "lucide-react";
import { fmtCurrency, fmtDate } from "@/lib/format";
import type { Tables } from "@/integrations/supabase/types";

type Entry = Tables<"finance_entries">;

interface Props {
  entries: Entry[];
  taxRate: number; // percentage, e.g. 25
}

const nextQuarterDue = (now: Date): Date => {
  // US-style estimated tax due dates: Apr 15, Jun 15, Sep 15, Jan 15
  const year = now.getFullYear();
  const candidates = [
    new Date(year, 3, 15),  // Apr 15
    new Date(year, 5, 15),  // Jun 15
    new Date(year, 8, 15),  // Sep 15
    new Date(year + 1, 0, 15), // Jan 15 (next year)
  ];
  for (const d of candidates) {
    if (d.getTime() >= now.getTime()) return d;
  }
  return candidates[candidates.length - 1];
};

export function TaxSummaryCard({ entries, taxRate }: Props) {
  const data = useMemo(() => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const ytd = entries.filter((e) => new Date(e.occurred_on) >= yearStart);

    const ytdIncome = ytd.filter((e) => e.kind === "income").reduce((s, e) => s + Number(e.amount), 0);
    const ytdExpense = ytd.filter((e) => e.kind === "expense").reduce((s, e) => s + Number(e.amount), 0);
    const ytdDeductible = ytd
      .filter((e) => e.kind === "expense" && e.tax_deductible)
      .reduce((s, e) => s + Number(e.amount), 0);
    const ytdNet = ytdIncome - ytdExpense;
    const estTax = Math.max(0, ytdNet) * (taxRate / 100);
    const nextDue = nextQuarterDue(now);

    return { ytdIncome, ytdExpense, ytdDeductible, ytdNet, estTax, nextDue };
  }, [entries, taxRate]);

  return (
    <GlassCard className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-primary/30 to-primary/0 blur-2xl" />
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" />
          <h3 className="font-display text-base font-semibold">Tax summary</h3>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          YTD · {taxRate}% rate
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Deductible expenses</p>
          <p className="mt-1 font-display text-lg font-semibold">{fmtCurrency(data.ytdDeductible)}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            of {fmtCurrency(data.ytdExpense)} total
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Estimated tax owed</p>
          <p className="mt-1 font-display text-lg font-semibold gradient-text">{fmtCurrency(data.estTax)}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            on {fmtCurrency(Math.max(0, data.ytdNet))} net
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] text-muted-foreground">Next quarterly payment</span>
        </div>
        <span className="text-xs font-semibold">{fmtDate(data.nextDue.toISOString())}</span>
      </div>
    </GlassCard>
  );
}
