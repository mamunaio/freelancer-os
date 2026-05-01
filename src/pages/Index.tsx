import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { FocusList } from "@/components/dashboard/FocusList";
import { ActiveProjects } from "@/components/dashboard/ActiveProjects";
import { AIInsights } from "@/components/dashboard/AIInsights";
import { UpcomingDeadlines } from "@/components/dashboard/UpcomingDeadlines";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { StatCardSkeleton } from "@/components/dashboard/Skeletons";
import { StaggerGrid, StaggerItem } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Briefcase, DollarSign, Plus, Target, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { fmtCurrency, fmtDuration } from "@/lib/format";

// Live clock hook
const useNow = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
};

// Build a 6-month sparkline series from finance entries
const buildMonthlySpark = (
  entries: { amount: number; occurred_on: string; kind: string }[],
  filterKind: "income" | "expense" | "net",
  months = 6,
) => {
  const out = Array(months).fill(0) as number[];
  const now = new Date();
  for (const e of entries) {
    const d = new Date(e.occurred_on);
    const idx =
      months - 1 -
      ((now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()));
    if (idx < 0 || idx >= months) continue;
    const amt = Number(e.amount);
    if (filterKind === "income" && e.kind === "income") out[idx] += amt;
    else if (filterKind === "expense" && e.kind === "expense") out[idx] += amt;
    else if (filterKind === "net") out[idx] += e.kind === "income" ? amt : -amt;
  }
  return out;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useWorkspace();
  const now = useNow();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [projectsRes, clientsRes, financeRes, tasksRes, timeRes] = await Promise.all([
        supabase.from("projects").select("id, status, created_at"),
        supabase.from("clients").select("id, status, created_at"),
        supabase
          .from("finance_entries")
          .select("amount, kind, occurred_on")
          .gte("occurred_on", sixMonthsAgo.toISOString().slice(0, 10)),
        supabase.from("tasks").select("id, done"),
        supabase
          .from("time_logs")
          .select("duration_seconds, started_at")
          .gte("started_at", sixMonthsAgo.toISOString()),
      ]);

      const finance = financeRes.data ?? [];
      const monthFinance = finance.filter(
        (e) => e.occurred_on >= monthStart.toISOString().slice(0, 10),
      );

      const activeProjects =
        projectsRes.data?.filter((p) => p.status === "in_progress").length ?? 0;
      const activeClients =
        clientsRes.data?.filter((c) => c.status === "active").length ?? 0;
      const monthIncome = monthFinance
        .filter((e) => e.kind === "income")
        .reduce((s, e) => s + Number(e.amount), 0);
      const monthExpense = monthFinance
        .filter((e) => e.kind === "expense")
        .reduce((s, e) => s + Number(e.amount), 0);
      const tasksOpen = (tasksRes.data ?? []).filter((t) => !t.done).length;
      const tasksDone = (tasksRes.data ?? []).filter((t) => t.done).length;

      // Sparklines
      const netSpark = buildMonthlySpark(finance, "net", 6);

      // Project count per month (cumulative active starts) — count created_at
      const projectsSpark = Array(6).fill(0) as number[];
      const clientsSpark = Array(6).fill(0) as number[];
      const ref = new Date();
      (projectsRes.data ?? []).forEach((p: any) => {
        const d = new Date(p.created_at);
        const idx = 5 - ((ref.getFullYear() - d.getFullYear()) * 12 + (ref.getMonth() - d.getMonth()));
        if (idx >= 0 && idx < 6) projectsSpark[idx] += 1;
      });
      (clientsRes.data ?? []).forEach((c: any) => {
        const d = new Date(c.created_at);
        const idx = 5 - ((ref.getFullYear() - d.getFullYear()) * 12 + (ref.getMonth() - d.getMonth()));
        if (idx >= 0 && idx < 6) clientsSpark[idx] += 1;
      });

      // Focus per month (last 6 months)
      const focusSpark = Array(6).fill(0) as number[];
      (timeRes.data ?? []).forEach((l: any) => {
        const d = new Date(l.started_at);
        const idx = 5 - ((ref.getFullYear() - d.getFullYear()) * 12 + (ref.getMonth() - d.getMonth()));
        if (idx >= 0 && idx < 6) focusSpark[idx] += l.duration_seconds;
      });
      const focusSeconds = focusSpark[5] ?? 0;

      return {
        activeProjects,
        activeClients,
        monthIncome,
        monthExpense,
        monthNet: monthIncome - monthExpense,
        tasksOpen,
        tasksDone,
        focusSeconds,
        netSpark,
        projectsSpark,
        clientsSpark,
        focusSpark,
      };
    },
  });

  const greeting = user?.email?.split("@")[0]?.split(".")[0] ?? "Admin";
  const greetingDisplay = greeting.charAt(0).toUpperCase() + greeting.slice(1);
  const wsName = settings?.name ?? "Injaazh PLC";

  const dateLabel = useMemo(
    () =>
      now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [now],
  );
  const timeLabel = useMemo(
    () =>
      now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }),
    [now],
  );

  return (
    <AppLayout>
      {/* ROW 1 — Welcome Header Bar */}
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.06] via-card to-card p-6 md:mb-8 md:flex-row md:items-center md:justify-between md:p-7">
        <div className="animate-fade-in">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Executive overview
          </p>
          <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight md:text-[38px]">
            Welcome back, {greetingDisplay}{" "}
            <span className="inline-block animate-pulse-glow">👋</span>
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground md:text-[15px]">
            Here's the pulse of {wsName} today.
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-3 md:items-end">
          <div className="text-right">
            <p className="text-xs font-medium text-muted-foreground">{dateLabel}</p>
            <p className="font-display text-xl font-bold tabular-nums tracking-tight">
              {timeLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/timer")}
              className="border-border/60 bg-secondary/40"
            >
              <Target className="mr-1.5 h-3.5 w-3.5" />
              Deep work
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/tasks")}
              className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Quick add
            </Button>
          </div>
        </div>
      </div>

      {/* ROW 2 — KPI Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StaggerItem>
            <StatCard
              label="Active Projects"
              value={String(stats?.activeProjects ?? 0)}
              delta={stats?.activeProjects ? "live" : undefined}
              trend="up"
              icon={Briefcase}
              accent="primary"
              spark={stats?.projectsSpark}
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              label="Net (this month)"
              value={fmtCurrency(stats?.monthNet ?? 0)}
              delta={stats?.monthIncome ? `${fmtCurrency(stats.monthIncome)} in` : undefined}
              trend={(stats?.monthNet ?? 0) >= 0 ? "up" : "down"}
              icon={DollarSign}
              accent="success"
              spark={stats?.netSpark}
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              label="Active Clients"
              value={String(stats?.activeClients ?? 0)}
              delta={stats?.activeClients ? "live" : undefined}
              trend="up"
              icon={Users}
              accent="accent"
              spark={stats?.clientsSpark}
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              label="Focus (this month)"
              value={fmtDuration(stats?.focusSeconds ?? 0)}
              delta={stats ? `${stats.tasksDone}/${stats.tasksDone + stats.tasksOpen} tasks` : undefined}
              trend="up"
              icon={Target}
              accent="warning"
              spark={stats?.focusSpark}
            />
          </StaggerItem>
        </StaggerGrid>
      )}

      {/* ROW 3 — Revenue + Active Projects (left) | Focus + AI Insights (right) */}
      <div className="mt-6 grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <RevenueChart />
          <ActiveProjects />
        </div>
        <div className="space-y-4 lg:col-span-4">
          <FocusList />
          <AIInsights />
        </div>
      </div>

      {/* ROW 4 — Bottom 3-column section */}
      <div className="mt-6 grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
        <UpcomingDeadlines />
        <RecentActivity />
        <QuickStats />
      </div>
    </AppLayout>
  );
};

export default Dashboard;
