import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/GlassCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Users, Mail, Phone, Building2, Pencil, Trash2, Loader2, LayoutGrid, KanbanSquare, Link2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmtCurrency } from "@/lib/format";
import { ClientCardSkeleton } from "@/components/dashboard/Skeletons";
import { StaggerGrid, StaggerItem } from "@/components/PageTransition";
import { ClientFilters, type SortKey, type StatusFilter } from "@/components/clients/ClientFilters";
import { PipelineBoard } from "@/components/clients/PipelineBoard";
import { TagInput } from "@/components/clients/TagInput";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Client = Tables<"clients"> & { projects?: { id: string }[] };
type Status = Enums<"client_status">;
type Stage = Enums<"pipeline_stage">;

const copyPortalLink = async (e: React.MouseEvent, c: Client) => {
  e.stopPropagation();
  const url = `${window.location.origin}/portal/${encodeURIComponent(c.portal_token)}`;
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Portal link copied", { description: url });
  } catch {
    toast.error("Could not copy. Link: " + url);
  }
};

const statusStyles: Record<Status, string> = {
  lead: "bg-warning/15 text-warning border-warning/30",
  active: "bg-success/15 text-success border-success/30",
  completed: "bg-primary/15 text-primary border-primary/30",
};

interface FormState {
  name: string;
  company: string;
  email: string;
  phone: string;
  status: Status;
  pipeline_stage: Stage;
  total_revenue: string;
  notes: string;
  tags: string[];
}

const empty: FormState = {
  name: "", company: "", email: "", phone: "",
  status: "lead", pipeline_stage: "lead",
  total_revenue: "0", notes: "", tags: [],
};

const Clients = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [view, setView] = useState<"grid" | "pipeline">("grid");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("revenue_desc");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*, projects(id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Client[];
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Name is required");
      const payload = {
        name: form.name.trim(),
        company: form.company.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        status: form.status,
        pipeline_stage: form.pipeline_stage,
        total_revenue: Number(form.total_revenue) || 0,
        notes: form.notes.trim() || null,
        tags: form.tags,
      };
      if (editing) {
        const { error } = await supabase.from("clients").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clients").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Client updated" : "Client added");
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false); setEditing(null); setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Client removed");
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startEdit = (e: React.MouseEvent, c: Client) => {
    e.stopPropagation();
    setEditing(c);
    setForm({
      name: c.name,
      company: c.company ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      status: c.status,
      pipeline_stage: c.pipeline_stage ?? "lead",
      total_revenue: String(c.total_revenue ?? 0),
      notes: c.notes ?? "",
      tags: c.tags ?? [],
    });
    setOpen(true);
  };

  const startCreate = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const allTags = useMemo(() => {
    const set = new Set<string>();
    clients.forEach((c) => (c.tags ?? []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [clients]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let out = clients.filter((c) => {
      if (q && ![c.name, c.company, c.email].some((v) => v?.toLowerCase().includes(q))) return false;
      if (status !== "all" && c.status !== status) return false;
      if (selectedTags.length && !selectedTags.every((t) => (c.tags ?? []).includes(t))) return false;
      return true;
    });
    if (sort === "revenue_desc") out = [...out].sort((a, b) => Number(b.total_revenue) - Number(a.total_revenue));
    else if (sort === "name_asc") out = [...out].sort((a, b) => a.name.localeCompare(b.name));
    else out = [...out].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return out;
  }, [clients, search, status, selectedTags, sort]);

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Relationships"
        title="Client CRM"
        subtitle="Every client, every dollar, every project — one cinematic grid."
        actions={
          <div className="flex items-center gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as "grid" | "pipeline")}>
              <TabsList className="bg-secondary/40">
                <TabsTrigger value="grid" className="text-xs"><LayoutGrid className="mr-1.5 h-3.5 w-3.5" />Grid</TabsTrigger>
                <TabsTrigger value="pipeline" className="text-xs"><KanbanSquare className="mr-1.5 h-3.5 w-3.5" />Pipeline</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              size="sm"
              onClick={startCreate}
              className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New client
            </Button>
          </div>
        }
      />

      {view === "grid" && (
        <ClientFilters
          search={search} setSearch={setSearch}
          status={status} setStatus={setStatus}
          sort={sort} setSort={setSort}
          allTags={allTags} selectedTags={selectedTags} setSelectedTags={setSelectedTags}
        />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <ClientCardSkeleton key={i} />)}
        </div>
      ) : view === "pipeline" ? (
        clients.length === 0 ? (
          <EmptyState icon={Users} title="No clients yet" description="Add your first client to start your pipeline."
            action={<Button onClick={startCreate} className="bg-gradient-primary text-primary-foreground shadow-glow"><Plus className="mr-1.5 h-3.5 w-3.5" />Add client</Button>}
          />
        ) : <PipelineBoard clients={clients} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={clients.length === 0 ? "No clients yet" : "No matches"}
          description={clients.length === 0 ? "Add your first client to start tracking revenue and projects." : "Try a different filter or search term."}
          action={clients.length === 0 && (
            <Button onClick={startCreate} className="bg-gradient-primary text-primary-foreground shadow-glow">
              <Plus className="mr-1.5 h-3.5 w-3.5" />Add client
            </Button>
          )}
        />
      ) : (
        <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((c) => (
            <StaggerItem key={c.id}>
              <GlassCard hover onClick={() => navigate(`/clients/${c.id}`)} className="group flex h-full flex-col">
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-sm font-semibold text-primary-foreground">
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", statusStyles[c.status])}>
                    {c.status}
                  </span>
                </div>

                <h3 className="mt-4 font-display text-base font-semibold tracking-tight">{c.name}</h3>
                {c.company && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3" /> {c.company}
                  </p>
                )}

                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {c.email && (
                    <p className="flex items-center gap-1.5 truncate">
                      <Mail className="h-3 w-3 shrink-0" /> <span className="truncate">{c.email}</span>
                    </p>
                  )}
                  {c.phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3" /> {c.phone}
                    </p>
                  )}
                </div>

                {c.tags && c.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.tags.slice(0, 3).map((t) => (
                      <span key={t} className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                        {t}
                      </span>
                    ))}
                    {c.tags.length > 3 && (
                      <span className="text-[9px] text-muted-foreground">+{c.tags.length - 3}</span>
                    )}
                  </div>
                )}

                <div className="mt-auto pt-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue</p>
                      <p className="font-display text-lg font-semibold gradient-text">{fmtCurrency(Number(c.total_revenue))}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {c.projects?.length ?? 0} projects
                    </p>
                  </div>

                  <div className="mt-3 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="outline" size="sm"
                      className="h-7 flex-1 border-border/60 bg-secondary/40 text-xs"
                      onClick={(e) => startEdit(e, c)}
                    >
                      <Pencil className="mr-1 h-3 w-3" /> Edit
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      className="h-7 border-border/60 bg-secondary/40 text-xs text-primary hover:text-primary"
                      onClick={(e) => copyPortalLink(e, c)}
                      title="Copy client portal link"
                    >
                      <Link2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      className="h-7 border-border/60 bg-secondary/40 text-xs text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete ${c.name}?`)) remove.mutate(c.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </StaggerItem>
          ))}
        </StaggerGrid>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass border-border/60 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? "Edit client" : "New client"}</DialogTitle>
            <DialogDescription>Fill in the details. You can edit anything later.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border-border/60 bg-secondary/40" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="company">Company</Label>
                <Input id="company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="border-border/60 bg-secondary/40" />
              </div>
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
                  <SelectTrigger className="border-border/60 bg-secondary/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border-border/60 bg-secondary/40" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="border-border/60 bg-secondary/40" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Pipeline stage</Label>
              <Select value={form.pipeline_stage} onValueChange={(v) => setForm({ ...form, pipeline_stage: v as Stage })}>
                <SelectTrigger className="border-border/60 bg-secondary/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Tags</Label>
              <TagInput value={form.tags} onChange={(tags) => setForm({ ...form, tags })} />
            </div>
            <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-muted-foreground">
              <span className="text-primary">●</span> Total revenue is auto-rolled up from finance income entries linked to this client.
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="border-border/60 bg-secondary/40" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="border-border/60">Cancel</Button>
            <Button
              onClick={() => upsert.mutate()}
              disabled={upsert.isPending}
              className="bg-gradient-primary text-primary-foreground shadow-glow"
            >
              {upsert.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {editing ? "Save changes" : "Create client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Clients;
