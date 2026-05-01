import { useMemo } from "react";
import { GlassCard } from "@/components/GlassCard";
import {
  Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Cell,
} from "recharts";
import { Compass, Gauge, Briefcase, Users } from "lucide-react";
import { fmtCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Entry = Tables<"finance_entries">;
type Project = Tables<"projects">;
type Client = Tables<"clients">;

interface Props {
  entries: Entry[];
  projects: Project[];
  clients: Client[];
}

export function ForecastTab({ entries, projects, clients }: Props) {
  const data = useMemo(() => {
    const now = new Date();

    // === Projects: remaining budget weighted by (100 - progress)% ===
    const inProgressProjects = projects.filter((p) => p.status === "in_progress");
    const projectPipeline = inProgressProjects.reduce((sum, p) => {
      const budget = Number(p.budget ?? 0);
      const remainingPct = Math.max(0, 100 - (p.progress ?? 0)) / 100;
      return sum + budget * remainingPct;
    }, 0);

    // === Clients: pipeline avg revenue ===
    // Active stages that contribute to forecast
    const pipelineStages = new Set(["proposal_sent", "negotiation", "active"]);
    const pipelineClients = clients.filter((c) => pipelineStages.has(c.pipeline_stage));
    // Average revenue across ALL clients with revenue > 0 (baseline expectation)
    const clientsWithRevenue = clients.filter((c) => Number(c.total_revenue) > 0);
    const avgClientRevenue =
      clientsWithRevenue.length > 0
        ? clientsWithRevenue.reduce((s, c) => s + Number(c.total_revenue), 0) / clientsWithRevenue.length
        : 0;
    const clientPipeline = pipelineClients.length * avgClientRevenue;

    // === Distribute over next 6 months ===
    // Project revenue: split evenly across remaining months until deadline (clipped to 6)
    // Client revenue: distribute evenly across the 6 months
    const months: { label: string; projects: number; clients: number; total: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({
        label: d.toLocaleDateString("en-US", { month: "short" }),
        projects: 0,
        clients: clientPipeline / 6,
        total: 0,
      });
    }

    // Allocate each project's pipeline across months until its deadline
    inProgressProjects.forEach((p) => {
      const budget = Number(p.budget ?? 0);
      const remainingPct = Math.max(0, 100 - (p.progress ?? 0)) / 100;
      const remaining = budget * remainingPct;
      if (remaining <= 0) return;

      // Determine number of months from now until deadline (or 6 if no deadline)
      let monthsToDeadline = 6;
      if (p.deadline) {
        const dl = new Date(p.deadline);
        monthsToDeadline = Math.max(
          1,
          Math.min(
            6,
            (dl.getFullYear() - now.getFullYear()) * 12 + (dl.getMonth() - now.getMonth()) + 1,
          ),
        );
      }
      const perMonth = remaining / monthsToDeadline;
      for (let i = 0; i < monthsToDeadline; i++) {
        if (months[i]) months[i].projects += perMonth;
      }
    });

    months.forEach((m) => { m.total = m.projects + m.clients; });

    // === Runway calculation ===
    // Current balance ≈ all-time net
    const totalIncome = entries.filter((e) => e.kind === "income").reduce((s, e) => s + Number(e.amount), 0);
    const totalExpense = entries.filter((e) => e.kind === "expense").reduce((s, e) => s + Number(e.amount), 0);
    const balance = totalIncome - totalExpense;

    // Recent burn (last 3 months actual avg) + recurring monthly equivalent
    const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const recentBurn = (() => {
      let sum = 0;
      for (let i = 1; i <= 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const k = monthKey(d);
        sum += entries
          .filter((e) => e.kind === "expense" && monthKey(new Date(e.occurred_on)) === k)
          .reduce((s, e) => s + Number(e.amount), 0);
      }
      return sum / 3;
    })();
    const monthlyRecurring = entries
      .filter((e) => e.kind === "expense" && e.recurring === "monthly")
      .reduce((s, e) => s + Number(e.amount), 0);
    const yearlyRecurring = entries
      .filter((e) => e.kind === "expense" && e.recurring === "yearly")
      .reduce((s, e) => s + Number(e.amount), 0);
    const totalMonthlyBurn = recentBurn + monthlyRecurring + yearlyRecurring / 12;

    const runwayMonths = totalMonthlyBurn > 0 && balance > 0 ? balance / totalMonthlyBurn : Infinity;

    return {
      months, projectPipeline, clientPipeline,
      totalForecast: months.reduce((s, m) => s + m.total, 0),
      balance, totalMonthlyBurn, runwayMonths,
      pipelineClientsCount: pipelineClients.length,
      inProgressCount: inProgressProjects.length,
    };
  }, [entries, projects, clients]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <GlassCard className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-primary/30 to-accent/0 blur-2xl" />
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">6-month forecast</p>
          <p className="mt-2 font-display text-2xl font-semibold gradient-text">{fmtCurrency(data.totalForecast)}</p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Compass className="h-3 w-3" /> Projected revenue
          </p>
        </GlassCard>
        <GlassCard className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-success/30 to-success/0 blur-2xl" />
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Project pipeline</p>
          <p className="mt-2 font-display text-2xl font-semibold">{fmtCurrency(data.projectPipeline)}</p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Briefcase className="h-3 w-3" /> {data.inProgressCount} in progress
          </p>
        </GlassCard>
        <GlassCard className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-accent/30 to-accent/0 blur-2xl" />
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Client pipeline</p>
          <p className="mt-2 font-display text-2xl font-semibold">{fmtCurrency(data.clientPipeline)}</p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Users className="h-3 w-3" /> {data.pipelineClientsCount} active clients
          </p>
        </GlassCard>
        <GlassCard className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-destructive/30 to-destructive/0 blur-2xl" />
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Runway</p>
          <p className={cn(
            "mt-2 font-display text-2xl font-semibold",
            data.runwayMonths === Infinity
              ? "text-success"
              : data.runwayMonths < 3
                ? "text-destructive"
                : data.runwayMonths < 6
                  ? "text-warning"
                  : "text-success",
          )}>
            {data.runwayMonths === Infinity ? "∞" : `${data.runwayMonths.toFixed(1)} mo`}
          </p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Gauge className="h-3 w-3" /> at {fmtCurrency(data.totalMonthlyBurn)}/mo burn
          </p>
        </GlassCard>
      </div>

      {/* Forecast bar chart */}
      <GlassCard>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Projection</p>
            <h3 className="font-display text-lg font-semibold">Next 6 months</h3>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Projects</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" />Clients</span>
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <BarChart data={data.months} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} stroke="hsl(var(--border))" />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} stroke="hsl(var(--border))" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                formatter={(v: number, name: string) => [fmtCurrency(v), name === "projects" ? "Projects" : "Clients"]}
                cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
              />
              <Bar dataKey="projects" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]}>
                {data.months.map((_, i) => <Cell key={i} />)}
              </Bar>
              <Bar dataKey="clients" stackId="a" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          <span className="text-foreground">Project revenue</span> = remaining budget weighted by progress, distributed until deadline.
          <span className="text-foreground"> Client revenue</span> = avg historical revenue × pipeline clients in active/proposal/negotiation stages.
        </p>
      </GlassCard>
    </div>
  );
}
