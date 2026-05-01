import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GlassCard } from "@/components/GlassCard";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FocusListSkeleton } from "@/components/dashboard/Skeletons";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks"> & { projects: { name: string } | null };

const priorityStyles = {
  high: "bg-destructive/15 text-destructive",
  medium: "bg-warning/15 text-warning",
  low: "bg-success/15 text-success",
};

// Deterministic color from string for assignee dot
const avatarPalette = [
  "bg-primary/20 text-primary",
  "bg-accent/20 text-accent",
  "bg-success/20 text-success",
  "bg-warning/20 text-warning",
];
const colorFor = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return avatarPalette[h % avatarPalette.length];
};
const initialsFor = (s?: string | null) => {
  if (!s) return "—";
  const cleaned = s.replace(/[^a-zA-Z\s]/g, " ").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return s.slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
};

export function FocusList() {
  const qc = useQueryClient();
  const [newTask, setNewTask] = useState("");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["dashboard", "focus"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("tasks")
        .select("*, projects(name)")
        .lte("due_date", today)
        .order("done", { ascending: true })
        .order("due_date", { ascending: true })
        .limit(8);
      if (error) throw error;
      return data as Task[];
    },
  });

  const toggle = useMutation({
    mutationFn: async (t: Task) => {
      const { error } = await supabase.from("tasks").update({ done: !t.done }).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const add = useMutation({
    mutationFn: async (title: string) => {
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("tasks").insert({
        title, priority: "medium", is_urgent: false, is_important: true, quadrant: "q2", due_date: today,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Task added");
      setNewTask("");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    add.mutate(newTask.trim());
  };

  if (isLoading) return <FocusListSkeleton />;

  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <GlassCard className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Today's Focus
        </p>
        <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-foreground/80">
          {done}/{total} done
        </span>
      </div>

      {/* overall progress */}
      <div className="mb-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/60">
          <div
            className="h-full rounded-full bg-gradient-primary transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <form onSubmit={onSubmit} className="relative mb-3">
        <Plus className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Quick add task..."
          disabled={add.isPending}
          className="h-10 rounded-lg border-border/60 bg-secondary/40 pl-9 text-sm focus-visible:border-primary/50 focus-visible:bg-background"
        />
      </form>

      <div className="-mx-1 flex-1 space-y-1 overflow-y-auto pr-1">
        {tasks.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No tasks yet. Add one above.
          </p>
        ) : (
          tasks.map((t) => {
            const assigneeKey = t.projects?.name ?? t.title;
            return (
              <button
                key={t.id}
                onClick={() => toggle.mutate(t)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-lg border border-transparent px-2 py-2 text-left transition-all",
                  "hover:border-border/60 hover:bg-primary/[0.04]",
                  t.done && "opacity-50",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all",
                    t.done
                      ? "border-transparent bg-gradient-primary shadow-glow"
                      : "border-border/80 bg-background/40 group-hover:border-primary/60",
                  )}
                >
                  {t.done && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                </span>

                <span
                  className={cn(
                    "flex-1 truncate text-sm",
                    t.done && "text-muted-foreground line-through",
                  )}
                >
                  {t.title}
                </span>

                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold uppercase",
                    colorFor(assigneeKey),
                  )}
                  title={t.projects?.name ?? "Personal"}
                >
                  {initialsFor(assigneeKey)}
                </span>

                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                    priorityStyles[t.priority],
                  )}
                >
                  {t.priority[0]}
                </span>
              </button>
            );
          })
        )}
      </div>
    </GlassCard>
  );
}
