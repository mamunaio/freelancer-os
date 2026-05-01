import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, Clock, Calendar } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Project = Tables<"projects">;

interface ProposedTask {
  title: string;
  description?: string;
  estimated_hours: number;
  priority: Enums<"task_priority">;
  is_urgent: boolean;
  is_important: boolean;
  suggested_due_date: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  project: Project;
}

function quadrantOf(urgent: boolean, important: boolean): Enums<"task_quadrant"> {
  if (urgent && important) return "q1";
  if (!urgent && important) return "q2";
  if (urgent && !important) return "q3";
  return "q4";
}

const priorityStyles: Record<Enums<"task_priority">, string> = {
  high: "bg-destructive/15 text-destructive border-destructive/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground border-border",
};

export function AIGenerateTasksDialog({ open, onClose, project }: Props) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [tasks, setTasks] = useState<ProposedTask[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const generate = async () => {
    setLoading(true);
    setTasks([]);
    setSelected(new Set());
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-tasks", {
        body: {
          project_name: project.name,
          description: project.description ?? "",
          tech_stack: project.tech_stack ?? [],
          deadline: project.deadline,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const list = ((data as any)?.tasks ?? []) as ProposedTask[];
      setTasks(list);
      setSelected(new Set(list.map((_, i) => i)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate tasks");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (i: number) => {
    const next = new Set(selected);
    next.has(i) ? next.delete(i) : next.add(i);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === tasks.length) setSelected(new Set());
    else setSelected(new Set(tasks.map((_, i) => i)));
  };

  const insert = async () => {
    if (selected.size === 0) return;
    setInserting(true);
    try {
      const rows = Array.from(selected).map((i) => {
        const t = tasks[i];
        return {
          title: t.title,
          description: t.description ?? null,
          project_id: project.id,
          priority: t.priority,
          is_urgent: t.is_urgent,
          is_important: t.is_important,
          quadrant: quadrantOf(t.is_urgent, t.is_important),
          due_date: t.suggested_due_date || null,
        };
      });
      const { error } = await supabase.from("tasks").insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} task${rows.length === 1 ? "" : "s"} added`);
      qc.invalidateQueries({ queryKey: ["project-tasks", project.id] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      handleClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to insert tasks");
    } finally {
      setInserting(false);
    }
  };

  const handleClose = () => {
    setTasks([]);
    setSelected(new Set());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="glass border-border/60 max-h-[85vh] sm:max-w-2xl overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Generate tasks with AI
          </DialogTitle>
          <DialogDescription>
            GPT-4o will break <strong>{project.name}</strong> into a sensible task plan. Review, then bulk-insert.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {tasks.length === 0 ? (
            <div className="py-10 text-center">
              <Button onClick={generate} disabled={loading} className="bg-gradient-primary text-primary-foreground shadow-glow">
                {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
                {loading ? "Generating…" : "Generate task plan"}
              </Button>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Uses project name, description, tech stack, and deadline as context.
              </p>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <button onClick={toggleAll} className="text-xs text-primary hover:underline">
                  {selected.size === tasks.length ? "Deselect all" : "Select all"}
                </button>
                <span className="text-[11px] text-muted-foreground">{selected.size} of {tasks.length} selected</span>
              </div>
              {tasks.map((t, i) => (
                <label
                  key={i}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                    selected.has(i) ? "border-primary/40 bg-secondary/40" : "border-border/40 bg-secondary/10 hover:bg-secondary/20",
                  )}
                >
                  <Checkbox checked={selected.has(i)} onCheckedChange={() => toggle(i)} className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-semibold">{t.title}</p>
                      <span className={cn("rounded-md border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider", priorityStyles[t.priority])}>
                        {t.priority}
                      </span>
                      {t.is_urgent && <Badge variant="outline" className="h-4 border-destructive/40 text-[9px] text-destructive">Urgent</Badge>}
                      {t.is_important && <Badge variant="outline" className="h-4 border-primary/40 text-[9px] text-primary">Important</Badge>}
                    </div>
                    {t.description && <p className="mt-1 text-[11px] text-muted-foreground">{t.description}</p>}
                    <div className="mt-1.5 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {t.estimated_hours}h</span>
                      <span className="inline-flex items-center gap-1"><Calendar className="h-2.5 w-2.5" /> {t.suggested_due_date}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {tasks.length > 0 && (
            <Button variant="outline" onClick={generate} disabled={loading} className="border-border/60">
              {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
              Regenerate
            </Button>
          )}
          <Button variant="outline" onClick={handleClose} className="border-border/60">Cancel</Button>
          {tasks.length > 0 && (
            <Button onClick={insert} disabled={selected.size === 0 || inserting} className="bg-gradient-primary text-primary-foreground shadow-glow">
              {inserting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Add {selected.size} to project
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
