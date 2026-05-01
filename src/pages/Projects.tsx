import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Plus, KanbanSquare, Pencil, Trash2, Loader2, Calendar, X, Receipt, Star, Pin, Archive } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmtDate, daysUntil, fmtCurrency } from "@/lib/format";
import { KanbanColumnSkeleton } from "@/components/dashboard/Skeletons";
import { GanttTimeline } from "@/components/projects/GanttTimeline";
import { InvoiceDialog } from "@/components/projects/InvoiceDialog";
import { ProjectFilters, emptyFilters, type ProjectFilterState } from "@/components/projects/ProjectFilters";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Project = Tables<"projects">;
type Status = Enums<"project_status">;

const statusOrder: Status[] = ["planning", "in_progress", "review", "completed", "on_hold"];
const statusLabel: Record<Status, string> = {
  planning: "Planning", in_progress: "In Progress", review: "Review", completed: "Completed", on_hold: "On Hold",
};
const statusStyles: Record<Status, string> = {
  planning: "bg-muted text-muted-foreground border-border",
  in_progress: "bg-primary/15 text-primary border-primary/30",
  review: "bg-warning/15 text-warning border-warning/30",
  completed: "bg-success/15 text-success border-success/30",
  on_hold: "bg-destructive/15 text-destructive border-destructive/30",
};

interface Form {
  name: string;
  client_id: string;
  description: string;
  status: Status;
  progress: number;
  deadline: string;
  budget: string;
  techInput: string;
  tech_stack: string[];
  is_archived: boolean;
}
const empty: Form = { name: "", client_id: "none", description: "", status: "planning", progress: 0, deadline: "", budget: "0", techInput: "", tech_stack: [], is_archived: false };

const ProjectsPage = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [view, setView] = useState<"kanban" | "list" | "timeline">("kanban");
  const [invoiceFor, setInvoiceFor] = useState<(Project & { clients?: { name: string } | null }) | null>(null);
  const [filters, setFilters] = useState<ProjectFilterState>(emptyFilters);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, clients(id, name), finance_entries(amount, kind), invoices(id, amount, status)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      type Row = Project & {
        clients: { id: string; name: string } | null;
        finance_entries: { amount: number; kind: "income" | "expense" }[] | null;
        invoices: { id: string; amount: number; status: string }[] | null;
      };
      return (data as Row[]).map((p) => {
        const invs = p.invoices ?? [];
        return {
          ...p,
          actual_revenue: (p.finance_entries ?? [])
            .filter((f) => f.kind === "income")
            .reduce((s, f) => s + Number(f.amount), 0),
          invoice_count: invs.length,
          all_invoices_paid: invs.length > 0 && invs.every((i) => i.status === "paid"),
        };
      });
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-mini"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name is required");
      const payload = {
        name: form.name.trim(),
        client_id: form.client_id === "none" ? null : form.client_id,
        description: form.description.trim() || null,
        status: form.status,
        progress: Math.max(0, Math.min(100, Number(form.progress) || 0)),
        deadline: form.deadline || null,
        budget: Number(form.budget) || 0,
        tech_stack: form.tech_stack,
        is_archived: form.is_archived,
      };
      if (editing) {
        const { error } = await supabase.from("projects").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("projects").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Project updated" : "Project created");
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false); setEditing(null); setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("projects").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Project removed");
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await supabase.from("projects").update({ is_pinned: pinned }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.pinned ? "Pinned to top" : "Unpinned");
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleArchive = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase.from("projects").update({ is_archived: archived }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.archived ? "Project archived" : "Project restored");
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Auto-archive completed projects older than 30 days (run once per page load)
  const autoArchivedRef = useRef(false);
  useEffect(() => {
    if (autoArchivedRef.current || projects.length === 0) return;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const stale = projects.filter(
      (p) => p.status === "completed" && !p.is_archived && new Date(p.updated_at).getTime() < thirtyDaysAgo,
    );
    if (stale.length === 0) return;
    autoArchivedRef.current = true;
    (async () => {
      const { error } = await supabase
        .from("projects")
        .update({ is_archived: true })
        .in("id", stale.map((p) => p.id));
      if (!error) {
        toast.info(`${stale.length} completed project${stale.length === 1 ? "" : "s"} auto-archived`);
        qc.invalidateQueries({ queryKey: ["projects"] });
      }
    })();
  }, [projects, qc]);

  // Derived filter options
  const allTechs = Array.from(new Set(projects.flatMap((p) => p.tech_stack ?? []))).sort();
  const allYears = Array.from(
    new Set(projects.map((p) => new Date(p.created_at).getFullYear())),
  ).sort((a, b) => b - a);

  const archivedCount = projects.filter((p) => p.is_archived).length;

  // Apply filters (client-side, AND logic)
  const filteredProjects = projects.filter((p) => {
    // Hide archived unless explicitly toggled on
    if (!filters.showArchived && p.is_archived) return false;
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      const haystack = [
        p.name,
        p.clients?.name ?? "",
        ...(p.tech_stack ?? []),
      ].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filters.statuses.length > 0 && !filters.statuses.includes(p.status)) return false;
    if (filters.techs.length > 0 && !filters.techs.some((t) => (p.tech_stack ?? []).includes(t))) return false;
    if (filters.clientId !== "all" && p.client_id !== filters.clientId) return false;
    if (filters.year !== "all" && new Date(p.created_at).getFullYear() !== Number(filters.year)) return false;
    return true;
  });

  const pinnedProjects = filteredProjects.filter((p) => p.is_pinned);
  const unpinnedProjects = filteredProjects.filter((p) => !p.is_pinned);

  const startEdit = (p: Project) => {
    setEditing(p);
    setForm({
      name: p.name,
      client_id: p.client_id ?? "none",
      description: p.description ?? "",
      status: p.status,
      progress: p.progress,
      deadline: p.deadline ?? "",
      budget: String(p.budget ?? 0),
      techInput: "",
      tech_stack: p.tech_stack ?? [],
      is_archived: (p as Project & { is_archived?: boolean }).is_archived ?? false,
    });
    setOpen(true);
  };
  const startCreate = () => { setEditing(null); setForm(empty); setOpen(true); };

  const addTech = () => {
    const v = form.techInput.trim();
    if (!v || form.tech_stack.includes(v)) return;
    setForm({ ...form, tech_stack: [...form.tech_stack, v], techInput: "" });
  };
  const removeTech = (t: string) => setForm({ ...form, tech_stack: form.tech_stack.filter((x) => x !== t) });

  const onDragStart = (e: React.DragEvent, id: string) => e.dataTransfer.setData("text/plain", id);
  const onDrop = (e: React.DragEvent, status: Status) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) updateStatus.mutate({ id, status });
  };

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Delivery"
        title="Project Management"
        subtitle="Drag projects across the pipeline. Every move syncs to the database."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline" className="border-border/60">
              <Link to="/projects/archive">
                <Archive className="mr-1.5 h-3.5 w-3.5" /> View Archive
                {archivedCount > 0 && (
                  <span className="ml-1.5 rounded bg-muted px-1.5 text-[10px] font-bold tabular-nums text-muted-foreground">
                    {archivedCount}
                  </span>
                )}
              </Link>
            </Button>
            <Button size="sm" onClick={startCreate} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New project
            </Button>
          </div>
        }
      />

      <ProjectFilters
        filters={filters}
        onChange={setFilters}
        allClients={clients}
        allTechs={allTechs}
        allYears={allYears}
      />

      <Tabs value={view} onValueChange={(v) => setView(v as any)} className="mb-5">
        <TabsList className="bg-secondary/40">
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        view === "kanban" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {statusOrder.map((s, i) => (
              <KanbanColumnSkeleton key={s} count={i % 2 === 0 ? 2 : 1} />
            ))}
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )
      ) : projects.length === 0 ? (
        <EmptyState
          icon={KanbanSquare}
          title="No projects yet"
          description="Create your first project to start tracking progress and deadlines."
          action={
            <Button onClick={startCreate} className="bg-gradient-primary text-primary-foreground shadow-glow">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New project
            </Button>
          }
        />
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={KanbanSquare}
          title="No matches"
          description="No projects match the current search and filters. Try clearing them."
          action={
            <Button variant="outline" onClick={() => setFilters(emptyFilters)} className="border-border/60">
              Clear filters
            </Button>
          }
        />
      ) : view === "kanban" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {statusOrder.map((s) => {
            const items = filteredProjects
              .filter((p) => p.status === s)
              .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned));
            return (
              <div
                key={s}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, s)}
                className="rounded-xl border border-border/40 bg-secondary/20 p-3"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", statusStyles[s])}>
                    {statusLabel[s]}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{items.length}</span>
                </div>
                <motion.div
                  className="space-y-3 min-h-[60px]"
                  initial="hidden"
                  animate="show"
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
                >
                  {items.map((p, idx) => {
                    const days = daysUntil(p.deadline);
                    const budget = Number(p.budget ?? 0);
                    const actual = Number(p.actual_revenue ?? 0);
                    const billedPct = budget > 0 ? Math.min(999, Math.round((actual / budget) * 100)) : null;
                    return (
                      <motion.div
                        key={p.id}
                        drag={false}
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
                        }}
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 320, damping: 24 }}
                      >
                        <div
                          draggable
                          onDragStart={(e) => onDragStart(e, p.id)}
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest("[data-card-action]")) return;
                            navigate(`/projects/${p.id}`);
                          }}
                          className="glass cursor-pointer rounded-lg p-3 active:cursor-grabbing"
                        >
                        <div className="flex items-start justify-between gap-2">
                          <p className="flex items-center gap-1.5 text-sm font-medium leading-tight">
                            {p.is_pinned && <Pin className="h-3 w-3 shrink-0 fill-warning text-warning" />}
                            {p.name}
                          </p>
                          <div className="flex items-center gap-1" data-card-action>
                            <button
                              onClick={(e) => { e.stopPropagation(); togglePin.mutate({ id: p.id, pinned: !p.is_pinned }); }}
                              className={cn("transition-colors", p.is_pinned ? "text-warning" : "text-muted-foreground hover:text-warning")}
                              title={p.is_pinned ? "Unpin" : "Pin to top"}
                            >
                              <Star className={cn("h-3 w-3", p.is_pinned && "fill-warning")} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setInvoiceFor(p); }}
                              className="text-muted-foreground hover:text-primary"
                              title="Generate invoice"
                            >
                              <Receipt className="h-3 w-3" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); startEdit(p); }}
                              className="text-muted-foreground hover:text-foreground"
                              title="Edit"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        {p.clients && <p className="mt-0.5 text-[11px] text-muted-foreground">{p.clients.name}</p>}
                        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-secondary/60">
                          <div className="h-full bg-gradient-primary transition-all" style={{ width: `${p.progress}%` }} />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px]">
                          <span className="font-semibold tabular-nums">{p.progress}%</span>
                          {days !== null && (
                            <span className={cn("flex items-center gap-1", days < 7 ? "text-destructive" : "text-muted-foreground")}>
                              <Calendar className="h-2.5 w-2.5" />
                              {days < 0 ? `${-days}d late` : `${days}d`}
                            </span>
                          )}
                        </div>
                        {budget > 0 && (
                          <div className="mt-2 rounded-md border border-border/40 bg-background/40 p-1.5">
                            <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-muted-foreground">
                              <span className="flex items-center gap-1">
                                Billed
                                {p.all_invoices_paid && (
                                  <span className="rounded bg-success/20 px-1 py-px text-[8px] font-bold text-success border border-success/40">PAID</span>
                                )}
                              </span>
                              <span className={cn("tabular-nums", actual === 0 ? "text-muted-foreground" : billedPct! >= 100 ? "text-success" : billedPct! >= 75 ? "text-warning" : "text-warning")}>
                                {billedPct}%
                              </span>
                            </div>
                            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-secondary/60">
                              <div
                                className={cn("h-full transition-all", actual === 0 ? "bg-muted" : actual >= budget ? "bg-success" : "bg-warning")}
                                style={{ width: `${Math.min(100, billedPct!)}%` }}
                              />
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[10px] tabular-nums">
                              <span className={cn(actual === 0 ? "text-muted-foreground" : actual >= budget ? "text-success" : "text-warning")}>{fmtCurrency(actual)}</span>
                              <span className="text-muted-foreground">/ {fmtCurrency(budget)}</span>
                            </div>
                          </div>
                        )}
                        {p.tech_stack.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {p.tech_stack.slice(0, 3).map((t) => (
                              <span key={t} className="rounded border border-border/60 bg-background/40 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            );
          })}
        </div>
      ) : view === "timeline" ? (
        <GanttTimeline projects={[...pinnedProjects, ...unpinnedProjects]} />
      ) : (
        <GlassCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                  <th className="px-4 py-3 font-medium">Billed / Budget</th>
                  <th className="px-4 py-3 font-medium">Deadline</th>
                  <th className="px-4 py-3 font-medium">Tech</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {[
                  ...(pinnedProjects.length > 0
                    ? [{ kind: "header" as const, label: "Pinned", count: pinnedProjects.length }, ...pinnedProjects.map((p) => ({ kind: "row" as const, p }))]
                    : []),
                  ...(pinnedProjects.length > 0 && unpinnedProjects.length > 0
                    ? [{ kind: "header" as const, label: "All projects", count: unpinnedProjects.length }]
                    : []),
                  ...unpinnedProjects.map((p) => ({ kind: "row" as const, p })),
                ].map((entry, idx) => {
                  if (entry.kind === "header") {
                    return (
                      <tr key={`hdr-${idx}`} className="bg-secondary/30">
                        <td colSpan={8} className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {entry.label === "Pinned" && <Pin className="mr-1.5 inline h-3 w-3 fill-warning text-warning" />}
                          {entry.label} <span className="ml-1 text-muted-foreground/70">· {entry.count}</span>
                        </td>
                      </tr>
                    );
                  }
                  const p = entry.p;
                  const days = daysUntil(p.deadline);
                  const budget = Number(p.budget ?? 0);
                  const actual = Number(p.actual_revenue ?? 0);
                  const billedPct = budget > 0 ? Math.round((actual / budget) * 100) : null;
                  return (
                    <tr key={p.id} className="border-b border-border/30 transition-colors hover:bg-secondary/30">
                      <td className="px-4 py-3 font-medium">
                        <span className="flex items-center gap-1.5">
                          {p.is_pinned && <Pin className="h-3 w-3 shrink-0 fill-warning text-warning" />}
                          {p.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.clients?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", statusStyles[p.status])}>
                          {statusLabel[p.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary/60">
                            <div className="h-full bg-gradient-primary" style={{ width: `${p.progress}%` }} />
                          </div>
                          <span className="text-xs tabular-nums">{p.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {budget > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary/60">
                              <div
                                className={cn("h-full transition-all", actual === 0 ? "bg-muted" : actual >= budget ? "bg-success" : "bg-warning")}
                                style={{ width: `${Math.min(100, billedPct!)}%` }}
                              />
                            </div>
                            <span className={cn("whitespace-nowrap text-xs tabular-nums", actual === 0 ? "text-muted-foreground" : billedPct! >= 100 ? "text-success" : "text-warning")}>
                              {fmtCurrency(actual)} / {fmtCurrency(budget)}
                            </span>
                            {p.all_invoices_paid && (
                              <span className="rounded bg-success/20 px-1.5 py-0.5 text-[9px] font-bold text-success border border-success/40">PAID</span>
                            )}
                          </div>
                        ) : actual > 0 ? (
                          <span className="text-xs text-success tabular-nums">{fmtCurrency(actual)}</span>
                        ) : <span className="text-xs text-muted-foreground">$0</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.deadline ? (
                          <span className={cn(days !== null && days < 7 && "text-destructive")}>
                            {fmtDate(p.deadline)} {days !== null && `· ${days < 0 ? `${-days}d late` : `${days}d left`}`}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {p.tech_stack.map((t) => (
                            <span key={t} className="rounded border border-border/60 bg-secondary/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">{t}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost" size="icon"
                            className={cn("h-7 w-7", p.is_pinned ? "text-warning" : "text-muted-foreground hover:text-warning")}
                            onClick={() => togglePin.mutate({ id: p.id, pinned: !p.is_pinned })}
                            title={p.is_pinned ? "Unpin" : "Pin to top"}
                          >
                            <Star className={cn("h-3 w-3", p.is_pinned && "fill-warning")} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setInvoiceFor(p)} title="Generate invoice">
                            <Receipt className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(p)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => toggleArchive.mutate({ id: p.id, archived: !p.is_archived })}
                            title={p.is_archived ? "Restore from archive" : "Archive"}
                          >
                            <Archive className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => { if (confirm(`Delete ${p.name}?`)) remove.mutate(p.id); }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass border-border/60 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? "Edit project" : "New project"}</DialogTitle>
            <DialogDescription>Track progress, deadline, budget and tech stack.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border-border/60 bg-secondary/40" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Client</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger className="border-border/60 bg-secondary/40"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
                  <SelectTrigger className="border-border/60 bg-secondary/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOrder.map((s) => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label>Progress (%)</Label>
                <Input type="number" min="0" max="100" value={form.progress} onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })} className="border-border/60 bg-secondary/40" />
              </div>
              <div className="grid gap-1.5">
                <Label>Deadline</Label>
                <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="border-border/60 bg-secondary/40" />
              </div>
              <div className="grid gap-1.5">
                <Label>Budget ($)</Label>
                <Input type="number" min="0" step="0.01" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className="border-border/60 bg-secondary/40" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Tech stack</Label>
              <div className="flex gap-2">
                <Input
                  value={form.techInput}
                  onChange={(e) => setForm({ ...form, techInput: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTech(); } }}
                  placeholder="Next.js, MERN, Supabase…"
                  className="border-border/60 bg-secondary/40"
                />
                <Button type="button" variant="outline" className="border-border/60" onClick={addTech}>Add</Button>
              </div>
              {form.tech_stack.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {form.tech_stack.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-secondary/40 px-2 py-0.5 text-xs">
                      {t}
                      <button onClick={() => removeTech(t)} className="text-muted-foreground hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border-border/60 bg-secondary/40" />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/60 bg-secondary/30 px-3 py-2">
              <div className="flex items-center gap-2">
                <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <Label className="cursor-pointer">Archive project</Label>
                  <p className="text-[11px] text-muted-foreground">Hide from active views without deleting</p>
                </div>
              </div>
              <Switch
                checked={form.is_archived}
                onCheckedChange={(v) => setForm({ ...form, is_archived: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="border-border/60">Cancel</Button>
            <Button onClick={() => upsert.mutate()} disabled={upsert.isPending} className="bg-gradient-primary text-primary-foreground shadow-glow">
              {upsert.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {editing ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {invoiceFor && (
        <InvoiceDialog
          open={!!invoiceFor}
          onClose={() => setInvoiceFor(null)}
          project={invoiceFor}
        />
      )}
    </AppLayout>
  );
};

export default ProjectsPage;
