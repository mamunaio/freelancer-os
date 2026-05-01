import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/GlassCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, CheckSquare, Pencil, Trash2, Loader2, Check, Focus, Flame, Calendar,
  MoreHorizontal, Filter, Sparkles, CalendarClock, UserPlus2, XCircle, MoveRight, Briefcase, Clock, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import type { Tables, Enums } from "@/integrations/supabase/types";
import {
  WORK_TYPES, WORK_TYPE_BY_KEY, ENERGY_LEVELS, TIME_ESTIMATES, formatEstimate,
  type WorkTypeKey, type EnergyLevel,
} from "@/lib/taskMeta";

type Task = Tables<"tasks"> & { projects?: { id: string; name: string } | null };
type Priority = Enums<"task_priority">;
type Quadrant = Enums<"task_quadrant">;
type FilterMode = "all" | "today" | "overdue" | "project" | "work_type";

const priorityStyles: Record<Priority, string> = {
  high: "bg-destructive/15 text-destructive border-destructive/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  low: "bg-success/15 text-success border-success/30",
};

const priorityDot: Record<Priority, string> = {
  high: "bg-destructive shadow-[0_0_8px_hsl(var(--destructive)/0.6)]",
  medium: "bg-warning shadow-[0_0_8px_hsl(var(--warning)/0.5)]",
  low: "bg-success shadow-[0_0_8px_hsl(var(--success)/0.4)]",
};

type QuadrantTheme = {
  title: string;
  sub: string;
  hint: string;
  emptyLine: string;
  border: string; // left accent border color class
  bg: string; // soft background tint
  badge: string; // count badge styling
  glow: string; // ambient blur glow
  icon: typeof Flame;
};

const quadrantInfo: Record<Quadrant, QuadrantTheme> = {
  q1: {
    title: "Do",
    sub: "Urgent · Important",
    hint: "Do it now — these block everything else.",
    emptyLine: "All clear — nothing urgent!",
    border: "border-l-destructive",
    bg: "from-destructive/10 via-transparent to-transparent",
    badge: "bg-destructive/15 text-destructive border-destructive/30",
    glow: "from-destructive/30 to-destructive/0 border-destructive/30",
    icon: Flame,
  },
  q2: {
    title: "Schedule",
    sub: "Important · Not Urgent",
    hint: "Plan for later — protect time for these.",
    emptyLine: "No upcoming tasks planned.",
    border: "border-l-primary",
    bg: "from-primary/10 via-transparent to-transparent",
    badge: "bg-primary/15 text-primary border-primary/30",
    glow: "from-primary/30 to-primary/0 border-primary/30",
    icon: CalendarClock,
  },
  q3: {
    title: "Delegate",
    sub: "Urgent · Not Important",
    hint: "Hand off — someone else can own this.",
    emptyLine: "Nothing to hand off.",
    border: "border-l-warning",
    bg: "from-warning/10 via-transparent to-transparent",
    badge: "bg-warning/15 text-warning border-warning/30",
    glow: "from-warning/30 to-warning/0 border-warning/30",
    icon: UserPlus2,
  },
  q4: {
    title: "Eliminate",
    sub: "Neither",
    hint: "Cut the noise — consider deleting.",
    emptyLine: "No noise in your system.",
    border: "border-l-muted-foreground/40",
    bg: "from-muted/40 via-transparent to-transparent",
    badge: "bg-muted text-muted-foreground border-border/60",
    glow: "from-muted to-muted/0 border-border/60",
    icon: XCircle,
  },
};

const computeQuadrant = (urgent: boolean, important: boolean): Quadrant =>
  urgent && important ? "q1" : !urgent && important ? "q2" : urgent && !important ? "q3" : "q4";

const quadrantToFlags = (q: Quadrant): { is_urgent: boolean; is_important: boolean } => ({
  is_urgent: q === "q1" || q === "q3",
  is_important: q === "q1" || q === "q2",
});

interface Form {
  title: string;
  description: string;
  work_type: WorkTypeKey | "";
  priority: Priority;
  is_urgent: boolean;
  is_important: boolean;
  due_date: string;
  estimated_minutes: number | null;
  energy_level: EnergyLevel | "";
}
const empty: Form = {
  title: "", description: "", work_type: "", priority: "medium",
  is_urgent: false, is_important: true, due_date: "",
  estimated_minutes: null, energy_level: "",
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const startOfWeekISO = () => {
  const d = new Date();
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7; // make Monday start
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const TasksPage = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [deepWork, setDeepWork] = useState(false);
  const [hideDone, setHideDone] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [workTypeFilter, setWorkTypeFilter] = useState<WorkTypeKey | "">("");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks").select("*, projects(id, name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-mini"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Title is required");
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        is_urgent: form.is_urgent,
        is_important: form.is_important,
        quadrant: computeQuadrant(form.is_urgent, form.is_important),
        due_date: form.due_date || null,
        work_type: form.work_type || null,
        estimated_minutes: form.estimated_minutes ?? null,
        energy_level: form.energy_level || null,
      };
      if (editing) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tasks").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Task updated" : "Task added");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false); setEditing(null); setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleDone = useMutation({
    mutationFn: async (t: Task) => {
      const { error } = await supabase.from("tasks").update({ done: !t.done }).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task removed");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveQuadrant = useMutation({
    mutationFn: async ({ id, quadrant }: { id: string; quadrant: Quadrant }) => {
      const flags = quadrantToFlags(quadrant);
      const { error } = await supabase.from("tasks").update({ quadrant, ...flags }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task moved");
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startEdit = (t: Task) => {
    setEditing(t);
    setForm({
      title: t.title,
      description: t.description ?? "",
      priority: t.priority,
      is_urgent: t.is_urgent,
      is_important: t.is_important,
      due_date: t.due_date ?? "",
      work_type: ((t as Task & { work_type?: string | null }).work_type as WorkTypeKey | null) ?? "",
      estimated_minutes: (t as Task & { estimated_minutes?: number | null }).estimated_minutes ?? null,
      energy_level: ((t as Task & { energy_level?: string | null }).energy_level as EnergyLevel | null) ?? "",
    });
    setOpen(true);
  };
  const startCreate = (preselect?: Quadrant) => {
    setEditing(null);
    if (preselect) {
      setForm({ ...empty, ...quadrantToFlags(preselect) });
    } else {
      setForm(empty);
    }
    setOpen(true);
  };

  // Keyboard shortcut: "N" opens new task (when not typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "n" || e.key === "N") {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault();
        startCreate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const today = todayISO();
  const weekStart = startOfWeekISO();

  const focusSummary = useMemo(() => {
    const dueToday = tasks.filter((t) => !t.done && t.due_date === today).length;
    const overdue = tasks.filter((t) => !t.done && t.due_date && t.due_date < today).length;
    const completedThisWeek = tasks.filter((t) => t.done && t.updated_at >= weekStart).length;
    return { dueToday, overdue, completedThisWeek };
  }, [tasks, today, weekStart]);

  const filtered = useMemo(() => {
    let list = tasks.filter((t) => !(hideDone && t.done));
    if (filterMode === "today") list = list.filter((t) => t.due_date === today);
    else if (filterMode === "overdue") list = list.filter((t) => !t.done && t.due_date && t.due_date < today);
    else if (filterMode === "project" && projectFilter) list = list.filter((t) => t.project_id === projectFilter);
    else if (filterMode === "work_type" && workTypeFilter) {
      list = list.filter((t) => (t as Task & { work_type?: string | null }).work_type === workTypeFilter);
    }
    return list;
  }, [tasks, hideDone, filterMode, projectFilter, workTypeFilter, today]);

  const byQuadrant = (q: Quadrant) => filtered.filter((t) => t.quadrant === q);
  const focusList = deepWork ? filtered.filter((t) => !t.done && (t.quadrant === "q1" || t.quadrant === "q2")) : filtered;

  const filterLabel: Record<FilterMode, string> = {
    all: "All tasks",
    today: "Only today",
    overdue: "Overdue",
    project: projectFilter ? `Project: ${projects.find((p) => p.id === projectFilter)?.name ?? "—"}` : "By project",
    work_type: workTypeFilter ? `Type: ${WORK_TYPE_BY_KEY[workTypeFilter]?.label ?? "—"}` : "By work type",
  };

  const resetFilter = () => { setProjectFilter(""); setWorkTypeFilter(""); };

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Execution"
        title="The Ultimate To-Do"
        subtitle="Eisenhower-matrix sorted. Deep Work mode hides the noise."
        actions={
          <>
            <Button
              variant={deepWork ? "default" : "outline"}
              size="sm"
              onClick={() => setDeepWork((v) => !v)}
              className={cn(
                "border-border/60",
                deepWork ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-secondary/40",
              )}
            >
              <Focus className="mr-1.5 h-3.5 w-3.5" /> Deep Work
            </Button>
            <Button
              size="sm"
              onClick={() => startCreate()}
              className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New task
              <kbd className="ml-2 hidden rounded border border-primary-foreground/30 bg-primary-foreground/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold tracking-wider sm:inline-block">
                N
              </kbd>
            </Button>
          </>
        }
      />

      {/* Today's Focus summary */}
      <div className="-mt-3 mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-primary" />
          <span className="font-medium text-foreground">Today's focus:</span>
        </span>
        <span>
          <span className={cn("font-semibold", focusSummary.dueToday > 0 && "text-warning")}>
            {focusSummary.dueToday}
          </span>{" "}
          due today
        </span>
        <span className="text-muted-foreground/50">·</span>
        <span>
          <span className={cn("font-semibold", focusSummary.overdue > 0 && "text-destructive")}>
            {focusSummary.overdue}
          </span>{" "}
          overdue
        </span>
        <span className="text-muted-foreground/50">·</span>
        <span>
          <span className="font-semibold text-success">{focusSummary.completedThisWeek}</span> completed this week
        </span>
      </div>

      {/* Toolbar: filter + hide completed + counts */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="border-border/60 bg-secondary/40">
              <Filter className="mr-1.5 h-3.5 w-3.5" />
              {filterLabel[filterMode]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Filter tasks</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { setFilterMode("all"); resetFilter(); }}>
              All tasks
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setFilterMode("today"); resetFilter(); }}>
              Only today
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setFilterMode("overdue"); resetFilter(); }}>
              Overdue
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>By project</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-64 overflow-auto">
                {projects.length === 0 ? (
                  <DropdownMenuItem disabled>No projects</DropdownMenuItem>
                ) : projects.map((p) => (
                  <DropdownMenuItem key={p.id} onClick={() => { setFilterMode("project"); setWorkTypeFilter(""); setProjectFilter(p.id); }}>
                    {p.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>By work type</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-72 overflow-auto">
                {WORK_TYPES.map((w) => (
                  <DropdownMenuItem key={w.key} onClick={() => { setFilterMode("work_type"); setProjectFilter(""); setWorkTypeFilter(w.key); }}>
                    <span className="mr-2">{w.emoji}</span>{w.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={hideDone} onCheckedChange={setHideDone} />
          Hide completed
        </label>
        <span className="text-xs text-muted-foreground">
          {tasks.filter((t) => !t.done).length} open · {tasks.filter((t) => t.done).length} done
        </span>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks yet"
          description="Capture your first task. Tag it as urgent / important and it lands in the right quadrant."
          action={
            <Button onClick={() => startCreate()} className="bg-gradient-primary text-primary-foreground shadow-glow">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New task
            </Button>
          }
        />
      ) : deepWork ? (
        <GlassCard className="mx-auto max-w-3xl">
          <div className="mb-4 flex items-center gap-2">
            <Flame className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Deep Work · {focusList.length} tasks</h2>
          </div>
          <div className="space-y-2">
            {focusList.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">All clear. Take a breath. 🌱</p>
            ) : focusList.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                today={today}
                onToggle={() => toggleDone.mutate(t)}
                onEdit={() => startEdit(t)}
                onDelete={() => remove.mutate(t.id)}
                onMove={(q) => moveQuadrant.mutate({ id: t.id, quadrant: q })}
              />
            ))}
          </div>
        </GlassCard>
      ) : (
        <TooltipProvider delayDuration={300}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {(["q1", "q2", "q3", "q4"] as Quadrant[]).map((q) => {
              const items = byQuadrant(q);
              const info = quadrantInfo[q];
              const Icon = info.icon;
              return (
                <GlassCard
                  key={q}
                  className={cn(
                    "relative overflow-hidden border-l-4 bg-gradient-to-br",
                    info.border,
                    info.bg,
                  )}
                >
                  <div className={cn("pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br blur-2xl", info.glow)} />
                  <div className="relative mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg border", info.badge)}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="cursor-help font-display text-base font-semibold leading-tight">
                              {info.title}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent side="top">{info.hint}</TooltipContent>
                        </Tooltip>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{info.sub}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "min-w-[22px] rounded-md border px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums",
                        info.badge,
                      )}>
                        {items.length}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => startCreate(q)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Add to {info.title}</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="relative space-y-1.5">
                    {items.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                        <Icon className="h-5 w-5 text-muted-foreground/50" />
                        <p className="text-xs text-muted-foreground">{info.emptyLine}</p>
                      </div>
                    ) : items.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        today={today}
                        onToggle={() => toggleDone.mutate(t)}
                        onEdit={() => startEdit(t)}
                        onDelete={() => remove.mutate(t.id)}
                        onMove={(target) => moveQuadrant.mutate({ id: t.id, quadrant: target })}
                      />
                    ))}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </TooltipProvider>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass border-border/60 max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? "Edit task" : "New task"}</DialogTitle>
            <DialogDescription>Tag it as urgent / important — the matrix sorts it for you.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-2">
            {/* Section 1: Title + Description */}
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Title *</Label>
                <Input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="border-border/60 bg-secondary/40" />
              </div>
              <div className="grid gap-1.5">
                <Label>Description</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border-border/60 bg-secondary/40" />
              </div>
            </div>

            {/* Section 2: Work Type pills */}
            <div className="grid gap-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Work type</Label>
              <div className="flex flex-wrap gap-1.5">
                {WORK_TYPES.map((w) => {
                  const active = form.work_type === w.key;
                  return (
                    <button
                      key={w.key}
                      type="button"
                      onClick={() => setForm({ ...form, work_type: active ? "" : w.key })}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                        active
                          ? "border-primary/60 bg-primary/15 text-primary shadow-glow scale-[1.02]"
                          : "border-border/60 bg-secondary/40 text-muted-foreground hover:border-border hover:bg-secondary/60 hover:text-foreground",
                      )}
                    >
                      <span className="text-sm leading-none">{w.emoji}</span>
                      {w.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Urgency / Importance toggles + Priority */}
            <div className="grid gap-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Matrix & priority</Label>
              <div className="grid grid-cols-3 gap-3">
                <label className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/40 px-3 py-2.5">
                  <span className="text-sm">Urgent</span>
                  <Switch checked={form.is_urgent} onCheckedChange={(v) => setForm({ ...form, is_urgent: v })} />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/40 px-3 py-2.5">
                  <span className="text-sm">Important</span>
                  <Switch checked={form.is_important} onCheckedChange={(v) => setForm({ ...form, is_important: v })} />
                </label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Priority })}>
                  <SelectTrigger className="border-border/60 bg-secondary/40"><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High priority</SelectItem>
                    <SelectItem value="medium">Medium priority</SelectItem>
                    <SelectItem value="low">Low priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Section 4: Estimated time + Energy level (side by side) */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                  <Clock className="h-3 w-3" /> Estimated time
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {TIME_ESTIMATES.map((t) => {
                    const active = form.estimated_minutes === t.minutes;
                    return (
                      <button
                        key={t.minutes}
                        type="button"
                        onClick={() => setForm({ ...form, estimated_minutes: active ? null : t.minutes })}
                        className={cn(
                          "rounded-md border px-2.5 py-1 text-xs font-medium tabular-nums transition-all",
                          active
                            ? "border-primary/60 bg-primary/15 text-primary"
                            : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                  <Zap className="h-3 w-3" /> Energy required
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {ENERGY_LEVELS.map((e) => {
                    const active = form.energy_level === e.key;
                    return (
                      <button
                        key={e.key}
                        type="button"
                        onClick={() => setForm({ ...form, energy_level: active ? "" : e.key })}
                        className={cn(
                          "flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2 transition-all",
                          active
                            ? "border-primary/60 bg-primary/15 text-primary"
                            : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground",
                        )}
                        title={e.hint}
                      >
                        <span className="text-base leading-none">{e.emoji}</span>
                        <span className="text-[10px] font-semibold leading-none">{e.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section 5: Due date */}
            <div className="grid gap-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Due date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="border-border/60 bg-secondary/40 md:max-w-[240px]" />
            </div>

            {/* Quadrant preview badge */}
            <div className={cn(
              "flex items-center justify-between rounded-lg border px-3 py-2",
              quadrantInfo[computeQuadrant(form.is_urgent, form.is_important)].badge,
            )}>
              <span className="text-[11px] uppercase tracking-wider opacity-80">Lands in quadrant</span>
              <span className="text-sm font-semibold">
                {quadrantInfo[computeQuadrant(form.is_urgent, form.is_important)].title}
                <span className="ml-2 text-[10px] font-normal opacity-70">
                  {quadrantInfo[computeQuadrant(form.is_urgent, form.is_important)].sub}
                </span>
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="border-border/60">Cancel</Button>
            <Button onClick={() => upsert.mutate()} disabled={upsert.isPending} className="bg-gradient-primary text-primary-foreground shadow-glow">
              {upsert.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

function TaskRow({ task, today, onToggle, onEdit, onDelete, onMove }: {
  task: Task;
  today: string;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (q: Quadrant) => void;
}) {
  const isOverdue = !!task.due_date && !task.done && task.due_date < today;
  const isDueToday = !!task.due_date && !task.done && task.due_date === today;
  const ext = task as Task & { work_type?: string | null; estimated_minutes?: number | null };
  const workType = ext.work_type ? WORK_TYPE_BY_KEY[ext.work_type] : null;
  const estimateLabel = formatEstimate(ext.estimated_minutes);

  return (
    <div className={cn(
      "group relative flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 transition-all hover:border-border/60 hover:bg-secondary/40",
      task.done && "opacity-60",
    )}>
      {/* Priority dot */}
      <span
        aria-label={`Priority ${task.priority}`}
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", priorityDot[task.priority])}
      />

      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200",
          task.done ? "border-transparent bg-gradient-primary shadow-glow scale-95" : "border-border/80 bg-background/40 hover:border-primary/60 hover:scale-105",
        )}
      >
        <Check
          className={cn(
            "h-3 w-3 text-primary-foreground transition-all duration-200",
            task.done ? "opacity-100 scale-100" : "opacity-0 scale-50",
          )}
          strokeWidth={3}
        />
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className={cn(
            "truncate text-sm transition-all duration-300",
            task.done && "line-through text-muted-foreground",
          )}>
            {task.title}
          </p>
          {workType && (
            <span className={cn(
              "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
              workType.badge,
            )}>
              <span className="text-[10px] leading-none">{workType.emoji}</span>
              {workType.label}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
          {task.projects && (
            <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-secondary/60 px-1.5 py-0.5 text-muted-foreground">
              <Briefcase className="h-2.5 w-2.5" />
              {task.projects.name}
            </span>
          )}
          {estimateLabel && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              {estimateLabel}
            </span>
          )}
          {task.due_date && (
            <span className={cn(
              "inline-flex items-center gap-1 font-medium",
              isOverdue ? "text-destructive" : isDueToday ? "text-warning" : "text-muted-foreground",
            )}>
              <Calendar className="h-2.5 w-2.5" />
              {fmtDate(task.due_date)}
              {isOverdue && " · overdue"}
              {isDueToday && " · today"}
            </span>
          )}
        </div>
      </div>

      {/* Priority badge */}
      <span className={cn("hidden rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase sm:inline-block", priorityStyles[task.priority])}>
        {task.priority[0]}
      </span>

      {/* Quick actions */}
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit} title="Edit">
          <Pencil className="h-3 w-3" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6" title="More">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <MoveRight className="mr-2 h-3.5 w-3.5" /> Move to
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {(["q1", "q2", "q3", "q4"] as Quadrant[]).map((q) => (
                  <DropdownMenuItem
                    key={q}
                    disabled={task.quadrant === q}
                    onClick={() => onMove(q)}
                  >
                    {quadrantInfo[q].title}
                    <span className="ml-auto text-[10px] text-muted-foreground">{quadrantInfo[q].sub.split(" · ")[0]}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => { if (confirm("Delete task?")) onDelete(); }}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default TasksPage;
