import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/GlassCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Play, Pause, RotateCcw, Save, Timer as TimerIcon, Loader2, Clock, Trash2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmtClock, fmtDuration, fmtDate, fmtCurrencyDetailed } from "@/lib/format";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Mode = Enums<"timer_mode">;
type TimeLog = Tables<"time_logs">;

const POMODORO_SECONDS = 25 * 60;

const TimerPage = () => {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>("stopwatch");
  const [seconds, setSeconds] = useState(0); // stopwatch elapsed / pomodoro elapsed
  const [running, setRunning] = useState(false);
  const [taskId, setTaskId] = useState<string>("none");
  const [rate, setRate] = useState("75");
  const [note, setNote] = useState("");
  const [billable, setBillable] = useState(true);
  const intervalRef = useRef<number | null>(null);

  // Autostart from ?autostart=1 (used by Command Palette)
  useEffect(() => {
    if (searchParams.get("autostart") === "1") {
      setRunning(true);
      toast.success("Timer started");
      const next = new URLSearchParams(searchParams);
      next.delete("autostart");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (mode === "pomodoro" && s + 1 >= POMODORO_SECONDS) {
            setRunning(false);
            toast.success("Pomodoro complete! Take a break.");
            return POMODORO_SECONDS;
          }
          return s + 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [running, mode]);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks-mini"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("id, title, project_id").eq("done", false).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["time_logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("time_logs").select("*, tasks(id, title)").order("started_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data as (TimeLog & { tasks: { id: string; title: string } | null })[];
    },
  });

  const totals = (() => {
    const totalSec = logs.reduce((s, l) => s + l.duration_seconds, 0);
    const totalBill = logs.reduce((s, l) => s + (l.billable ? (l.duration_seconds / 3600) * Number(l.hourly_rate ?? 0) : 0), 0);
    const billableSec = logs.reduce((s, l) => s + (l.billable ? l.duration_seconds : 0), 0);
    return { totalSec, totalBill, billableSec };
  })();

  const save = useMutation({
    mutationFn: async () => {
      if (seconds < 5) throw new Error("Run the timer for at least 5 seconds");
      const t = tasks.find((x) => x.id === taskId);
      const { error } = await supabase.from("time_logs").insert({
        task_id: taskId === "none" ? null : taskId,
        project_id: t?.project_id ?? null,
        mode,
        duration_seconds: seconds,
        hourly_rate: Number(rate) || 0,
        note: note.trim() || null,
        billable,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Logged ${fmtDuration(seconds)}`);
      qc.invalidateQueries({ queryKey: ["time_logs"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setSeconds(0); setRunning(false); setNote("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("time_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Log removed");
      qc.invalidateQueries({ queryKey: ["time_logs"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reset = () => { setRunning(false); setSeconds(0); };

  const display = mode === "pomodoro" ? POMODORO_SECONDS - seconds : seconds;
  const pct = mode === "pomodoro" ? (seconds / POMODORO_SECONDS) * 100 : 0;
  const billableAmount = billable ? (seconds / 3600) * (Number(rate) || 0) : 0;

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Focus"
        title="Time Management Hub"
        subtitle="Stopwatch and Pomodoro — every second can become a billable hour."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GlassCard className="relative overflow-hidden p-8">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-[80px]" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-accent/20 blur-[80px]" />

            <div className="relative">
              <Tabs value={mode} onValueChange={(v) => { setMode(v as Mode); reset(); }}>
                <TabsList className="bg-secondary/40">
                  <TabsTrigger value="stopwatch"><Clock className="mr-1.5 h-3.5 w-3.5" />Stopwatch</TabsTrigger>
                  <TabsTrigger value="pomodoro"><TimerIcon className="mr-1.5 h-3.5 w-3.5" />Pomodoro</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="my-10 flex flex-col items-center">
                {mode === "pomodoro" && (
                  <div className="mb-4 h-1.5 w-64 overflow-hidden rounded-full bg-secondary/60">
                    <div className="h-full bg-gradient-primary transition-all duration-1000" style={{ width: `${pct}%` }} />
                  </div>
                )}
                <p className="font-display text-7xl font-semibold tabular-nums tracking-tight gradient-text md:text-8xl">
                  {fmtClock(display)}
                </p>
                <p className="mt-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  {billable ? <>Billable: <span className="text-foreground">{fmtCurrencyDetailed(billableAmount)}</span></> : <span className="text-muted-foreground">Non-billable session</span>}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  onClick={() => setRunning((v) => !v)}
                  className={cn(
                    "h-12 min-w-[140px] text-sm",
                    running ? "bg-secondary text-foreground hover:bg-secondary/80" : "bg-gradient-primary text-primary-foreground shadow-glow",
                  )}
                >
                  {running ? <><Pause className="mr-1.5 h-4 w-4" />Pause</> : <><Play className="mr-1.5 h-4 w-4" />Start</>}
                </Button>
                <Button onClick={reset} variant="outline" className="h-12 border-border/60 bg-secondary/40">
                  <RotateCcw className="mr-1.5 h-4 w-4" />Reset
                </Button>
                <Button
                  onClick={() => save.mutate()}
                  disabled={save.isPending || seconds < 5}
                  variant="outline"
                  className="h-12 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                >
                  {save.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                  Save log
                </Button>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Task</Label>
                  <Select value={taskId} onValueChange={setTaskId}>
                    <SelectTrigger className="border-border/60 bg-secondary/40"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {tasks.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Hourly rate ($)</Label>
                  <Input type="number" min="0" step="1" value={rate} onChange={(e) => setRate(e.target.value)} disabled={!billable} className="border-border/60 bg-secondary/40 disabled:opacity-50" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Note</Label>
                  <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you work on?" className="border-border/60 bg-secondary/40" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-lg border border-border/60 bg-secondary/30 px-4 py-3">
                <div className="flex items-center gap-2">
                  <DollarSign className={cn("h-4 w-4", billable ? "text-primary" : "text-muted-foreground")} />
                  <div>
                    <Label htmlFor="billable-toggle" className="text-xs font-medium cursor-pointer">Billable session</Label>
                    <p className="text-[10px] text-muted-foreground">Counts toward billable hours and revenue</p>
                  </div>
                </div>
                <Switch id="billable-toggle" checked={billable} onCheckedChange={setBillable} />
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="space-y-4">
          <GlassCard>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">This week</p>
            <p className="mt-3 font-display text-2xl font-semibold tabular-nums">{fmtDuration(totals.totalSec)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Logged across {logs.length} sessions</p>
            <div className="mt-3 border-t border-border/40 pt-3 space-y-2">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Billable hours</p>
                <p className="mt-1 font-display text-sm font-semibold tabular-nums">{fmtDuration(totals.billableSec)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Billable revenue</p>
                <p className="mt-1 font-display text-lg font-semibold gradient-text">{fmtCurrencyDetailed(totals.totalBill)}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <p className="mb-3 font-display text-sm font-semibold">Recent sessions</p>
            {isLoading ? (
              <div className="flex h-20 items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No logs yet.</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {logs.map((l) => (
                  <div key={l.id} className="group flex items-start gap-2 rounded-lg border border-transparent p-2 transition-colors hover:border-border/60 hover:bg-secondary/30">
                    <div className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", l.mode === "pomodoro" ? "bg-accent" : "bg-primary")} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-xs font-medium">{l.tasks?.title ?? l.note ?? "Untitled session"}</p>
                        {!l.billable && <span className="shrink-0 rounded-sm bg-muted px-1 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">Non-billable</span>}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {fmtDate(l.started_at)} · {fmtDuration(l.duration_seconds)}
                        {l.billable && <> · {fmtCurrencyDetailed((l.duration_seconds / 3600) * Number(l.hourly_rate ?? 0))}</>}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive" onClick={() => remove.mutate(l.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {logs.length === 0 && !isLoading && (
        <div className="mt-6">
          <EmptyState icon={TimerIcon} title="Start your first session" description="Pick a task, hit Start, then save the log to track billable hours." />
        </div>
      )}
    </AppLayout>
  );
};

export default TimerPage;
