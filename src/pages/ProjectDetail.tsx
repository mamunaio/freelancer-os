import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { fmtCurrency, fmtDate, daysUntil } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft, CheckSquare, FolderOpen, GitMerge, Activity, Receipt,
  Upload, Trash2, Loader2, Plus, Calendar, FileText, DollarSign,
  CheckCircle2, Circle, Eye, Download, Pencil, Sparkles, PackageOpen,
} from "lucide-react";
import { InvoiceDialog } from "@/components/projects/InvoiceDialog";
import { AIGenerateTasksDialog } from "@/components/projects/AIGenerateTasksDialog";
import { DeliverablesTab } from "@/components/projects/DeliverablesTab";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Project = Tables<"projects"> & { clients?: { id: string; name: string } | null };
type Task = Tables<"tasks">;
type Milestone = Tables<"project_milestones">;
type ProjectFile = Tables<"project_files">;
type ProjectActivity = Tables<"project_activity">;
type Invoice = Tables<"invoices">;

const statusStyles: Record<Enums<"project_status">, string> = {
  planning: "bg-muted text-muted-foreground border-border",
  in_progress: "bg-primary/15 text-primary border-primary/30",
  review: "bg-warning/15 text-warning border-warning/30",
  completed: "bg-success/15 text-success border-success/30",
  on_hold: "bg-destructive/15 text-destructive border-destructive/30",
};

const invoiceStatusStyles: Record<Enums<"invoice_status">, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-primary/15 text-primary border-primary/30",
  paid: "bg-success/15 text-success border-success/30",
  overdue: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [aiTasksOpen, setAiTasksOpen] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, clients(id, name)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as Project | null;
    },
    enabled: !!id,
  });

  const { data: actualBilled = 0 } = useQuery({
    queryKey: ["project-billed", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_entries").select("amount").eq("project_id", id!).eq("kind", "income");
      if (error) throw error;
      return (data ?? []).reduce((s, r) => s + Number(r.amount), 0);
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Project not found.</p>
          <Button onClick={() => navigate("/projects")} variant="outline" className="mt-4">Back to projects</Button>
        </div>
      </AppLayout>
    );
  }

  const budget = Number(project.budget ?? 0);
  const billedPct = budget > 0 ? Math.round((actualBilled / budget) * 100) : 0;
  const days = daysUntil(project.deadline);

  return (
    <AppLayout>
      <Link to="/projects" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> All projects
      </Link>

      {/* Header */}
      <GlassCard className="mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{project.name}</h1>
              <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", statusStyles[project.status])}>
                {project.status.replace("_", " ")}
              </span>
            </div>
            {project.clients && (
              <Link to={`/clients/${project.clients.id}`} className="mt-1 inline-block text-sm text-muted-foreground hover:text-primary">
                {project.clients.name}
              </Link>
            )}
            {project.description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{project.description}</p>}

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Progress</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <Progress value={project.progress} className="h-1.5 flex-1" />
                  <span className="text-xs font-semibold tabular-nums">{project.progress}%</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Billed / Budget</p>
                {budget > 0 ? (
                  <div className="mt-1.5">
                    <p className="text-xs">
                      <span className={cn("font-semibold", billedPct >= 100 ? "text-success" : "text-foreground")}>
                        {fmtCurrency(actualBilled)}
                      </span>
                      <span className="text-muted-foreground"> / {fmtCurrency(budget)}</span>
                    </p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary/60">
                      <div className={cn("h-full", billedPct >= 100 ? "bg-success" : "bg-gradient-primary")}
                           style={{ width: `${Math.min(100, billedPct)}%` }} />
                    </div>
                  </div>
                ) : <p className="mt-1.5 text-xs text-muted-foreground">No budget set</p>}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Deadline</p>
                {project.deadline ? (
                  <p className="mt-1.5 text-xs">
                    <span className="font-semibold">{fmtDate(project.deadline)}</span>
                    {days !== null && (
                      <span className={cn("ml-2", days < 0 ? "text-destructive" : days < 7 ? "text-warning" : "text-muted-foreground")}>
                        · {days < 0 ? `${-days}d late` : `${days}d left`}
                      </span>
                    )}
                  </p>
                ) : <p className="mt-1.5 text-xs text-muted-foreground">Not set</p>}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
            <Button onClick={() => setAiTasksOpen(true)} variant="outline" className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Generate tasks
            </Button>
            <Button onClick={() => { setEditingInvoice(null); setInvoiceOpen(true); }} className="bg-gradient-primary text-primary-foreground shadow-glow">
              <Receipt className="mr-1.5 h-3.5 w-3.5" /> Generate Invoice
            </Button>
          </div>
        </div>
      </GlassCard>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="bg-secondary/40">
          <TabsTrigger value="tasks"><CheckSquare className="mr-1.5 h-3.5 w-3.5" /> Tasks</TabsTrigger>
          <TabsTrigger value="deliverables"><PackageOpen className="mr-1.5 h-3.5 w-3.5" /> Deliverables</TabsTrigger>
          <TabsTrigger value="files"><FolderOpen className="mr-1.5 h-3.5 w-3.5" /> Files</TabsTrigger>
          <TabsTrigger value="timeline"><GitMerge className="mr-1.5 h-3.5 w-3.5" /> Timeline</TabsTrigger>
          <TabsTrigger value="invoices"><Receipt className="mr-1.5 h-3.5 w-3.5" /> Invoices</TabsTrigger>
          <TabsTrigger value="activity"><Activity className="mr-1.5 h-3.5 w-3.5" /> Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-5">
          <TasksTab projectId={project.id} projectName={project.name} />
        </TabsContent>
        <TabsContent value="deliverables" className="mt-5">
          <DeliverablesTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="files" className="mt-5">
          <FilesTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="timeline" className="mt-5">
          <MilestonesTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="invoices" className="mt-5">
          <InvoicesTab projectId={project.id} onEdit={(inv) => { setEditingInvoice(inv); setInvoiceOpen(true); }} onCreate={() => { setEditingInvoice(null); setInvoiceOpen(true); }} />
        </TabsContent>
        <TabsContent value="activity" className="mt-5">
          <ActivityTab projectId={project.id} />
        </TabsContent>
      </Tabs>

      <InvoiceDialog
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        project={project}
        existingInvoice={editingInvoice}
      />

      <AIGenerateTasksDialog
        open={aiTasksOpen}
        onClose={() => setAiTasksOpen(false)}
        project={project}
      />
    </AppLayout>
  );
};

/* ----------- TASKS ----------- */
function TasksTab({ projectId, projectName }: { projectId: string; projectName: string }) {
  const qc = useQueryClient();
  const [newTitle, setNewTitle] = useState("");

  const { data: tasks = [] } = useQuery({
    queryKey: ["project-tasks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!newTitle.trim()) return;
      const { error } = await supabase.from("tasks").insert({ title: newTitle.trim(), project_id: projectId });
      if (error) throw error;
    },
    onSuccess: () => { setNewTitle(""); qc.invalidateQueries({ queryKey: ["project-tasks", projectId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.from("tasks").update({ done }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-tasks", projectId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-tasks", projectId] }),
  });

  const completed = tasks.filter((t) => t.done).length;

  return (
    <GlassCard>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-semibold">Tasks</h2>
          <p className="text-[11px] text-muted-foreground">{completed}/{tasks.length} done</p>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add.mutate(); }}
          placeholder={`New task for ${projectName}…`}
          className="border-border/60 bg-secondary/40"
        />
        <Button onClick={() => add.mutate()} disabled={!newTitle.trim()} className="bg-gradient-primary text-primary-foreground shadow-glow">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {tasks.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">No tasks yet.</p>
      ) : (
        <div className="space-y-1">
          {tasks.map((t) => (
            <motion.div
              key={t.id}
              layout
              className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-secondary/30"
            >
              <Checkbox checked={t.done} onCheckedChange={(v) => toggle.mutate({ id: t.id, done: !!v })} />
              <span className={cn("flex-1 text-sm", t.done && "text-muted-foreground line-through")}>{t.title}</span>
              {t.due_date && (
                <span className="text-[10px] text-muted-foreground"><Calendar className="mr-1 inline h-2.5 w-2.5" />{fmtDate(t.due_date)}</span>
              )}
              <Button variant="ghost" size="icon" onClick={() => remove.mutate(t.id)} className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

/* ----------- FILES ----------- */
function FilesTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: files = [] } = useQuery({
    queryKey: ["project-files", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_files").select("*").eq("project_id", projectId).order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data as ProjectFile[];
    },
  });

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${projectId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("project-files").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("project_files").insert({
        project_id: projectId,
        name: file.name,
        storage_path: path,
        size_bytes: file.size,
        mime_type: file.type,
      });
      if (dbErr) throw dbErr;
      toast.success(`${file.name} uploaded`);
      qc.invalidateQueries({ queryKey: ["project-files", projectId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const openFile = async (f: ProjectFile) => {
    const { data, error } = await supabase.storage.from("project-files").createSignedUrl(f.storage_path, 3600);
    if (error) { toast.error(error.message); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const remove = useMutation({
    mutationFn: async (f: ProjectFile) => {
      await supabase.storage.from("project-files").remove([f.storage_path]);
      const { error } = await supabase.from("project_files").delete().eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("File removed"); qc.invalidateQueries({ queryKey: ["project-files", projectId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const fmtSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <GlassCard>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-semibold">Files</h2>
          <p className="text-[11px] text-muted-foreground">{files.length} files · stored privately</p>
        </div>
        <label className="cursor-pointer">
          <input type="file" className="hidden" disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.currentTarget.value = ""; }}
          />
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-glow",
            uploading && "opacity-50 pointer-events-none"
          )}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Upload
          </span>
        </label>
      </div>

      {files.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">No files yet. Upload contracts, briefs, deliverables…</p>
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.id} className="group flex items-center gap-3 rounded-md border border-border/40 bg-secondary/20 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{f.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {fmtSize(f.size_bytes)} · {fmtDate(f.uploaded_at)} · {f.mime_type || "file"}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => openFile(f)} className="h-7 text-xs">
                <Eye className="mr-1 h-3 w-3" /> Open
              </Button>
              <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Delete ${f.name}?`)) remove.mutate(f); }} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

/* ----------- MILESTONES ----------- */
function MilestonesTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Milestone | null>(null);
  const [form, setForm] = useState({ title: "", description: "", due_date: "" });

  const { data: items = [] } = useQuery({
    queryKey: ["project-milestones", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_milestones").select("*").eq("project_id", projectId)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Milestone[];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Title required");
      const payload = {
        project_id: projectId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        due_date: form.due_date || null,
      };
      if (editing) {
        const { error } = await supabase.from("project_milestones").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("project_milestones").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Milestone updated" : "Milestone added");
      qc.invalidateQueries({ queryKey: ["project-milestones", projectId] });
      setOpen(false); setEditing(null); setForm({ title: "", description: "", due_date: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from("project_milestones").update({ completed }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-milestones", projectId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_milestones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Milestone removed"); qc.invalidateQueries({ queryKey: ["project-milestones", projectId] }); },
  });

  return (
    <GlassCard>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">Milestones</h2>
        <Button size="sm" onClick={() => { setEditing(null); setForm({ title: "", description: "", due_date: "" }); setOpen(true); }} className="bg-gradient-primary text-primary-foreground shadow-glow">
          <Plus className="mr-1 h-3 w-3" /> Add milestone
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">No milestones yet.</p>
      ) : (
        <div className="relative space-y-3 pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border/40">
          {items.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="group relative rounded-lg border border-border/40 bg-secondary/20 p-3"
            >
              <button
                onClick={() => toggle.mutate({ id: m.id, completed: !m.completed })}
                className="absolute -left-[18px] top-3 flex h-4 w-4 items-center justify-center rounded-full bg-background ring-2 ring-border/60 hover:ring-primary"
              >
                {m.completed ? <CheckCircle2 className="h-3 w-3 text-success" /> : <Circle className="h-3 w-3 text-muted-foreground" />}
              </button>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-semibold", m.completed && "text-muted-foreground line-through")}>{m.title}</p>
                  {m.description && <p className="mt-0.5 text-[11px] text-muted-foreground">{m.description}</p>}
                  {m.due_date && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      <Calendar className="mr-1 inline h-2.5 w-2.5" />{fmtDate(m.due_date)}
                    </p>
                  )}
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(m); setForm({ title: m.title, description: m.description ?? "", due_date: m.due_date ?? "" }); setOpen(true); }} className="h-6 w-6">
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Delete "${m.title}"?`)) remove.mutate(m.id); }} className="h-6 w-6 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass border-border/60 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? "Edit milestone" : "Add milestone"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="border-border/60 bg-secondary/40" />
            </div>
            <div className="grid gap-1.5">
              <Label>Due date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="border-border/60 bg-secondary/40" />
            </div>
            <div className="grid gap-1.5">
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border-border/60 bg-secondary/40" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="border-border/60">Cancel</Button>
            <Button onClick={() => upsert.mutate()} disabled={upsert.isPending} className="bg-gradient-primary text-primary-foreground shadow-glow">
              {upsert.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {editing ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GlassCard>
  );
}

/* ----------- INVOICES ----------- */
function InvoicesTab({ projectId, onEdit, onCreate }: { projectId: string; onEdit: (inv: Invoice) => void; onCreate: () => void }) {
  const { data: invoices = [] } = useQuery({
    queryKey: ["project-invoices", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Invoice[];
    },
  });

  const total = invoices.reduce((s, i) => s + Number(i.amount), 0);
  const paid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0);

  return (
    <GlassCard>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-semibold">Invoices</h2>
          <p className="text-[11px] text-muted-foreground">
            {invoices.length} total · {fmtCurrency(paid)} paid / {fmtCurrency(total)} billed
          </p>
        </div>
        <Button size="sm" onClick={onCreate} className="bg-gradient-primary text-primary-foreground shadow-glow">
          <Plus className="mr-1 h-3 w-3" /> New invoice
        </Button>
      </div>

      {invoices.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">No invoices yet.</p>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div key={inv.id} className="group flex items-center gap-3 rounded-md border border-border/40 bg-secondary/20 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Receipt className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{inv.invoice_number}</p>
                <p className="text-[10px] text-muted-foreground">
                  Issued {fmtDate(inv.issue_date)}{inv.due_date ? ` · Due ${fmtDate(inv.due_date)}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-sm font-semibold gradient-text">{fmtCurrency(Number(inv.amount))}</p>
                <span className={cn("inline-block mt-0.5 rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-wider", invoiceStatusStyles[inv.status])}>
                  {inv.status}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onEdit(inv)} className="h-7 text-xs">
                <Pencil className="mr-1 h-3 w-3" /> Edit
              </Button>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

/* ----------- ACTIVITY ----------- */
function ActivityTab({ projectId }: { projectId: string }) {
  const { data: activity = [] } = useQuery({
    queryKey: ["project-activity", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_activity").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(80);
      if (error) throw error;
      return data as ProjectActivity[];
    },
  });

  const colors: Record<string, string> = {
    created: "bg-primary",
    status_changed: "bg-warning",
    progress_changed: "bg-success",
    deadline_changed: "bg-accent",
    invoice_created: "bg-primary",
    invoice_status_changed: "bg-success",
    proposal_created: "bg-accent",
    proposal_status_changed: "bg-warning",
    proposal_accepted: "bg-success",
  };

  return (
    <GlassCard>
      <h2 className="mb-4 font-display text-base font-semibold flex items-center gap-2">
        <Activity className="h-4 w-4" /> Activity
      </h2>
      {activity.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">No activity yet.</p>
      ) : (
        <div className="relative space-y-3 pl-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-px before:bg-border/40">
          {activity.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className="relative"
            >
              <span className={cn("absolute -left-3.5 top-1 h-2 w-2 rounded-full ring-2 ring-background", colors[a.action] || "bg-muted")} />
              <p className="text-xs font-medium">{a.description || a.action}</p>
              <p className="text-[10px] text-muted-foreground/70">
                {new Date(a.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

export default ProjectDetail;
