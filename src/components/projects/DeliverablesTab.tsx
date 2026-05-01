import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus, Loader2, Pencil, Trash2, Upload, FileText, CheckCircle2, Clock, RotateCcw, Eye,
} from "lucide-react";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Deliverable = Tables<"deliverables">;
type Status = Enums<"deliverable_status">;

const statusStyles: Record<Status, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  approved: "bg-success/15 text-success border-success/30",
  revision_requested: "bg-destructive/15 text-destructive border-destructive/30",
};
const statusIcon: Record<Status, typeof Clock> = {
  pending: Clock,
  approved: CheckCircle2,
  revision_requested: RotateCcw,
};

interface FormState {
  title: string;
  description: string;
  file: File | null;
  keepExistingFile: boolean;
}
const emptyForm: FormState = { title: "", description: "", file: null, keepExistingFile: true };

export function DeliverablesTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Deliverable | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["project-deliverables", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliverables")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Deliverable[];
    },
  });

  const startCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const startEdit = (d: Deliverable) => {
    setEditing(d);
    setForm({ title: d.title, description: d.description ?? "", file: null, keepExistingFile: !!d.file_path });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    setBusy(true);
    try {
      let file_path = editing?.file_path ?? null;
      let file_name = editing?.file_name ?? null;
      let mime_type = editing?.mime_type ?? null;
      let size_bytes = editing?.size_bytes ?? 0;

      if (form.file) {
        const ext = form.file.name.split(".").pop() || "bin";
        const path = `${projectId}/deliverables/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("project-files").upload(path, form.file, { contentType: form.file.type });
        if (upErr) throw upErr;
        // Remove the old file if we replaced it
        if (editing?.file_path) {
          await supabase.storage.from("project-files").remove([editing.file_path]);
        }
        file_path = path;
        file_name = form.file.name;
        mime_type = form.file.type;
        size_bytes = form.file.size;
      } else if (editing && !form.keepExistingFile && editing.file_path) {
        await supabase.storage.from("project-files").remove([editing.file_path]);
        file_path = null; file_name = null; mime_type = null; size_bytes = 0;
      }

      const payload = {
        project_id: projectId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        file_path, file_name, mime_type, size_bytes,
      };

      if (editing) {
        const { error } = await supabase.from("deliverables").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Deliverable updated");
      } else {
        const { error } = await supabase.from("deliverables").insert(payload);
        if (error) throw error;
        toast.success("Deliverable added");
      }
      qc.invalidateQueries({ queryKey: ["project-deliverables", projectId] });
      setOpen(false); setEditing(null); setForm(emptyForm);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = useMutation({
    mutationFn: async (d: Deliverable) => {
      if (d.file_path) await supabase.storage.from("project-files").remove([d.file_path]);
      const { error } = await supabase.from("deliverables").delete().eq("id", d.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deliverable removed");
      qc.invalidateQueries({ queryKey: ["project-deliverables", projectId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const preview = async (d: Deliverable) => {
    if (!d.file_path) return;
    const { data, error } = await supabase.storage.from("project-files").createSignedUrl(d.file_path, 3600);
    if (error) { toast.error(error.message); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const fmtSize = (bytes: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <GlassCard>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-semibold">Deliverables</h2>
          <p className="text-[11px] text-muted-foreground">Client-facing items shown in their portal for approval.</p>
        </div>
        <Button size="sm" onClick={startCreate} className="bg-gradient-primary text-primary-foreground shadow-glow">
          <Plus className="mr-1 h-3 w-3" /> New deliverable
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">
          No deliverables yet. Add one and your client can review and approve it from their portal.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((d) => {
            const Icon = statusIcon[d.status];
            return (
              <div key={d.id} className="group flex items-start gap-3 rounded-lg border border-border/40 bg-secondary/20 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">{d.title}</p>
                    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", statusStyles[d.status])}>
                      <Icon className="h-2.5 w-2.5" />
                      {d.status === "revision_requested" ? "revision" : d.status}
                    </span>
                  </div>
                  {d.description && <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{d.description}</p>}
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {d.file_name ? `${d.file_name}${d.size_bytes ? ` · ${fmtSize(d.size_bytes)}` : ""}` : "No file attached"} · added {fmtDate(d.created_at)}
                  </p>
                  {d.status === "approved" && d.approved_by_name && (
                    <p className="mt-1 text-[11px] text-success">
                      Approved by {d.approved_by_name} · {d.approved_at ? fmtDate(d.approved_at) : ""}
                    </p>
                  )}
                  {d.status === "revision_requested" && d.revision_notes && (
                    <div className="mt-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
                      <strong>Client notes:</strong> {d.revision_notes}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  {d.file_path && (
                    <Button variant="ghost" size="icon" onClick={() => preview(d)} className="h-7 w-7" title="Preview file">
                      <Eye className="h-3 w-3" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => startEdit(d)} className="h-7 w-7">
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => { if (confirm(`Delete "${d.title}"?`)) remove.mutate(d); }}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass border-border/60 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? "Edit deliverable" : "New deliverable"}</DialogTitle>
            <DialogDescription>Shared with the client through their portal.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="d-title">Title *</Label>
              <Input id="d-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="border-border/60 bg-secondary/40" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="d-desc">Description</Label>
              <Textarea id="d-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border-border/60 bg-secondary/40" placeholder="What is this and what should the client review?" />
            </div>
            <div className="grid gap-1.5">
              <Label>File {editing?.file_path && <span className="text-muted-foreground">(already attached)</span>}</Label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border/60 bg-secondary/30 px-3 py-4 text-xs hover:border-primary/40">
                <Upload className="h-3.5 w-3.5" />
                {form.file ? form.file.name : editing?.file_name ? `Replace "${editing.file_name}"…` : "Choose a file"}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setForm({ ...form, file: f, keepExistingFile: f ? true : form.keepExistingFile });
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              {editing?.file_path && !form.file && (
                <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={!form.keepExistingFile}
                    onChange={(e) => setForm({ ...form, keepExistingFile: !e.target.checked })}
                  />
                  Remove current file
                </label>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="border-border/60">Cancel</Button>
            <Button onClick={submit} disabled={busy} className="bg-gradient-primary text-primary-foreground shadow-glow">
              {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GlassCard>
  );
}
