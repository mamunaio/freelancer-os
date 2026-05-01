import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/GlassCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { fmtCurrency, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FileSignature, Plus, Loader2, ExternalLink, Copy, Trash2, Pencil } from "lucide-react";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Proposal = Tables<"proposals">;
type Status = Enums<"proposal_status">;

const statusStyles: Record<Status, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-primary/15 text-primary border-primary/30",
  viewed: "bg-warning/15 text-warning border-warning/30",
  accepted: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  expired: "bg-muted text-muted-foreground border-border",
};

const Proposals = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", client_id: "none", project_id: "none", price: "0" });

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["proposals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*, clients(name), projects(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as (Proposal & { clients?: { name: string } | null; projects?: { name: string } | null })[];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-mini"],
    queryFn: async () => (await supabase.from("clients").select("id, name").order("name")).data ?? [],
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects-mini"],
    queryFn: async () => (await supabase.from("projects").select("id, name").order("name")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Title required");
      const { data, error } = await supabase.from("proposals").insert({
        title: form.title.trim(),
        client_id: form.client_id === "none" ? null : form.client_id,
        project_id: form.project_id === "none" ? null : form.project_id,
        price: Number(form.price) || 0,
      }).select().single();
      if (error) throw error;
      return data as Proposal;
    },
    onSuccess: (p) => {
      toast.success("Proposal drafted");
      qc.invalidateQueries({ queryKey: ["proposals"] });
      setOpen(false);
      setForm({ title: "", client_id: "none", project_id: "none", price: "0" });
      navigate(`/proposals/${p.id}/edit`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("proposals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Proposal removed"); qc.invalidateQueries({ queryKey: ["proposals"] }); },
  });

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/proposals/share/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Share link copied");
  };

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Sales"
        title="Proposals"
        subtitle="Craft, share, and track every proposal in one place."
        actions={
          <Button size="sm" onClick={() => setOpen(true)} className="bg-gradient-primary text-primary-foreground shadow-glow">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New proposal
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : proposals.length === 0 ? (
        <EmptyState icon={FileSignature} title="No proposals yet" description="Draft your first proposal to start tracking deals."
          action={<Button onClick={() => setOpen(true)} className="bg-gradient-primary text-primary-foreground shadow-glow"><Plus className="mr-1.5 h-3.5 w-3.5" />New proposal</Button>}
        />
      ) : (
        <div className="grid gap-3">
          {proposals.map((p) => (
            <GlassCard key={p.id} className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                <FileSignature className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link to={`/proposals/${p.id}/edit`} className="truncate font-display text-base font-semibold hover:text-primary">{p.title}</Link>
                  <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", statusStyles[p.status])}>{p.status}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {p.clients?.name ?? "No client"}{p.projects?.name ? ` · ${p.projects.name}` : ""} · created {fmtDate(p.created_at)}
                  {p.accepted_at && ` · accepted ${fmtDate(p.accepted_at)}`}
                </p>
              </div>
              <p className="font-display text-lg font-semibold gradient-text">{fmtCurrency(Number(p.price))}</p>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => copyLink(p.share_token)} title="Copy share link" className="h-8 w-8">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => window.open(`/proposals/share/${p.share_token}`, "_blank")} title="Open public view" className="h-8 w-8">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => navigate(`/proposals/${p.id}/edit`)} className="h-8 w-8">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Delete "${p.title}"?`)) remove.mutate(p.id); }} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass border-border/60 sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display">New proposal</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Q1 Website Rebuild" className="border-border/60 bg-secondary/40" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Client</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger className="border-border/60 bg-secondary/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Project</Label>
                <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                  <SelectTrigger className="border-border/60 bg-secondary/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Price ($)</Label>
              <Input type="number" min={0} step={0.01} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="border-border/60 bg-secondary/40" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="border-border/60">Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending} className="bg-gradient-primary text-primary-foreground shadow-glow">
              {create.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Draft proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Proposals;
