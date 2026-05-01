import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2, Sparkles, FolderKanban, Receipt, CheckCircle2, Clock,
  Activity as ActivityIcon, Download, FileText, AlertCircle, RotateCcw,
} from "lucide-react";
import { fmtCurrency, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Workspace {
  name: string | null;
  tagline: string | null;
  logo_url: string | null;
  accent_hsl: string | null;
}
interface PortalClient { id: string; name: string; company: string | null; email: string | null; }
interface PortalProject {
  id: string; name: string; description: string | null;
  status: string; progress: number;
  deadline: string | null; start_date: string | null;
}
interface PortalInvoice {
  id: string; invoice_number: string; amount: number;
  issue_date: string; due_date: string | null; status: string;
}
interface PortalMilestone {
  id: string; project_id: string; project_name: string;
  title: string; description: string | null; due_date: string | null;
  completed: boolean; approved_at: string | null; approved_by_name: string | null;
  sort_order: number;
}
interface PortalDeliverable {
  id: string; project_id: string; project_name: string;
  title: string; description: string | null;
  file_name: string | null; mime_type: string | null; size_bytes: number; has_file: boolean;
  status: "pending" | "approved" | "revision_requested";
  approved_at: string | null; approved_by_name: string | null;
  revision_notes: string | null; created_at: string;
}
interface PortalActivity {
  id: string; project_id: string; project_name: string;
  action: string; description: string | null; created_at: string;
}
interface PortalData {
  ok: boolean;
  error?: string;
  workspace: Workspace | null;
  client: PortalClient;
  projects: PortalProject[];
  unpaid_invoices: PortalInvoice[];
  milestones: PortalMilestone[];
  deliverables: PortalDeliverable[];
  recent_activity: PortalActivity[];
}

const projectStatusStyle = (s: string) =>
  ({
    planning: "bg-muted text-muted-foreground border-border",
    in_progress: "bg-primary/15 text-primary border-primary/30",
    review: "bg-warning/15 text-warning border-warning/30",
    completed: "bg-success/15 text-success border-success/30",
    on_hold: "bg-destructive/15 text-destructive border-destructive/30",
  }[s] || "bg-muted text-muted-foreground border-border");

const Portal = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Approval dialog state
  const [approvalTarget, setApprovalTarget] = useState<
    | { kind: "milestone"; id: string; title: string }
    | { kind: "deliverable"; id: string; title: string; status: "approved" | "revision_requested" }
    | null
  >(null);
  const [approverName, setApproverName] = useState("");
  const [approverEmail, setApproverEmail] = useState("");
  const [revisionNotes, setRevisionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!token) return;
    try {
      const { data: result, error: rpcErr } = await supabase.rpc("get_portal_data", { _token: token });
      if (rpcErr) throw rpcErr;
      const payload = result as unknown as PortalData;
      if (!payload?.ok) {
        setError(payload?.error ?? "This portal link is invalid.");
        setData(null);
      } else {
        setData(payload);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load portal");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token]);

  // Apply workspace accent color to this page only
  const accentStyle = useMemo(() => {
    const accent = data?.workspace?.accent_hsl;
    if (!accent) return undefined;
    return { ["--primary" as string]: accent, ["--ring" as string]: accent } as React.CSSProperties;
  }, [data?.workspace?.accent_hsl]);

  const totalUnpaid = (data?.unpaid_invoices ?? []).reduce((s, i) => s + Number(i.amount), 0);

  const downloadDeliverable = async (d: PortalDeliverable) => {
    if (!token || !d.has_file) return;
    const t = toast.loading(`Preparing ${d.file_name ?? d.title}…`);
    try {
      const { data: res, error: fnErr } = await supabase.functions.invoke("portal-deliverable-url", {
        body: { token, deliverable_id: d.id },
      });
      if (fnErr) throw fnErr;
      const url = (res as { url?: string; error?: string })?.url;
      if (!url) throw new Error((res as { error?: string })?.error ?? "Could not generate link");
      window.open(url, "_blank", "noopener");
      toast.success("Download ready", { id: t });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed", { id: t });
    }
  };

  const submitApproval = async () => {
    if (!approvalTarget || !token) return;
    if (!approverName.trim() || !approverEmail.trim()) {
      toast.error("Please enter your name and email");
      return;
    }
    setSubmitting(true);
    try {
      if (approvalTarget.kind === "milestone") {
        const { data: res, error: rpcErr } = await supabase.rpc("approve_milestone", {
          _token: token,
          _milestone_id: approvalTarget.id,
          _name: approverName.trim(),
          _email: approverEmail.trim(),
        });
        if (rpcErr) throw rpcErr;
        const r = res as { ok: boolean; error?: string };
        if (!r.ok) throw new Error(r.error ?? "Could not approve");
        toast.success("Milestone approved 🎉");
      } else {
        const { data: res, error: rpcErr } = await supabase.rpc("set_deliverable_status", {
          _token: token,
          _deliverable_id: approvalTarget.id,
          _status: approvalTarget.status,
          _name: approverName.trim(),
          _email: approverEmail.trim(),
          _revision_notes: approvalTarget.status === "revision_requested" ? revisionNotes.trim() || null : null,
        });
        if (rpcErr) throw rpcErr;
        const r = res as { ok: boolean; error?: string };
        if (!r.ok) throw new Error(r.error ?? "Could not submit");
        toast.success(approvalTarget.status === "approved" ? "Approved 🎉" : "Revision requested");
      }
      setApprovalTarget(null);
      setRevisionNotes("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
        <div>
          <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 font-display text-2xl font-semibold">Portal unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error ?? "This link may have expired or been revoked."}</p>
        </div>
      </div>
    );
  }

  const w = data.workspace;

  return (
    <div className="min-h-screen bg-background" style={accentStyle}>
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-14">
        {/* Brand header */}
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-gradient-primary shadow-glow">
              {w?.logo_url ? (
                <img src={w.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Client portal</p>
              <p className="font-display text-base font-semibold">{w?.name ?? "Studio"}</p>
            </div>
          </div>
          <div className="hidden text-right md:block">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Welcome</p>
            <p className="font-display text-sm font-semibold">
              {data.client.name}{data.client.company ? ` · ${data.client.company}` : ""}
            </p>
          </div>
        </motion.header>

        {/* Hero summary */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-10"
        >
          <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Hello, {data.client.name.split(" ")[0]}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Here's everything happening on your projects with {w?.name ?? "us"}. Approve deliverables, track progress, and view outstanding invoices — no login required.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <SummaryStat label="Active projects" value={String(data.projects.filter((p) => p.status !== "completed").length)} icon={FolderKanban} />
            <SummaryStat label="Outstanding" value={fmtCurrency(totalUnpaid)} icon={Receipt} />
            <SummaryStat label="Awaiting approval" value={String(data.deliverables.filter((d) => d.status === "pending" && d.has_file).length + data.milestones.filter((m) => m.completed && !m.approved_at).length)} icon={CheckCircle2} />
          </div>
        </motion.section>

        {/* Projects */}
        <Section title="Projects" subtitle={`${data.projects.length} total`}>
          {data.projects.length === 0 ? (
            <EmptyText>No projects yet.</EmptyText>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.projects.map((p) => (
                <div key={p.id} className="rounded-xl border border-border/40 bg-card/40 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display text-sm font-semibold">{p.name}</p>
                    <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", projectStatusStyle(p.status))}>
                      {p.status.replace("_", " ")}
                    </span>
                  </div>
                  {p.description && <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{p.description}</p>}
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Progress</span><span className="tabular-nums">{p.progress}%</span>
                    </div>
                    <Progress value={p.progress} className="h-1.5" />
                  </div>
                  {p.deadline && (
                    <p className="mt-2 text-[11px] text-muted-foreground">Due {fmtDate(p.deadline)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Deliverables */}
        <Section title="Deliverables" subtitle={`${data.deliverables.length} for review`}>
          {data.deliverables.length === 0 ? (
            <EmptyText>No deliverables shared yet.</EmptyText>
          ) : (
            <div className="space-y-3">
              {data.deliverables.map((d) => (
                <div key={d.id} className="rounded-xl border border-border/40 bg-card/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-display text-sm font-semibold">{d.title}</p>
                        <DeliverableBadge status={d.status} />
                      </div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.project_name}</p>
                      {d.description && <p className="mt-1 text-[12px] text-muted-foreground">{d.description}</p>}
                      {d.has_file && (
                        <button
                          onClick={() => downloadDeliverable(d)}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-[11px] hover:bg-secondary"
                        >
                          <Download className="h-3 w-3" /> {d.file_name ?? "Download"}
                        </button>
                      )}
                      {d.status === "approved" && d.approved_by_name && (
                        <p className="mt-2 text-[11px] text-success">Approved by {d.approved_by_name} · {d.approved_at ? fmtDate(d.approved_at) : ""}</p>
                      )}
                      {d.status === "revision_requested" && d.revision_notes && (
                        <div className="mt-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
                          <strong>Revision requested:</strong> {d.revision_notes}
                        </div>
                      )}
                    </div>
                    {d.status === "pending" && (
                      <div className="flex shrink-0 gap-1.5">
                        <Button
                          size="sm" variant="outline"
                          className="h-7 border-border/60 bg-secondary/40 text-[11px]"
                          onClick={() => { setApprovalTarget({ kind: "deliverable", id: d.id, title: d.title, status: "revision_requested" }); }}
                        >
                          <RotateCcw className="mr-1 h-3 w-3" /> Request changes
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 bg-gradient-primary text-primary-foreground text-[11px] shadow-glow"
                          onClick={() => { setApprovalTarget({ kind: "deliverable", id: d.id, title: d.title, status: "approved" }); }}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Milestones */}
        <Section title="Milestones" subtitle="Project checkpoints">
          {data.milestones.length === 0 ? (
            <EmptyText>No milestones yet.</EmptyText>
          ) : (
            <div className="space-y-2">
              {data.milestones.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 px-4 py-3">
                  <div className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                    m.approved_at ? "border-success/40 bg-success/15 text-success"
                      : m.completed ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-border/60 bg-secondary/40 text-muted-foreground"
                  )}>
                    {m.approved_at ? <CheckCircle2 className="h-3.5 w-3.5" /> : m.completed ? <Clock className="h-3.5 w-3.5" /> : <span className="text-[10px]">{m.sort_order + 1}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{m.title}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {m.project_name}{m.due_date ? ` · due ${fmtDate(m.due_date)}` : ""}
                    </p>
                    {m.approved_at && m.approved_by_name && (
                      <p className="mt-0.5 text-[11px] text-success">Approved by {m.approved_by_name}</p>
                    )}
                  </div>
                  {m.completed && !m.approved_at && (
                    <Button
                      size="sm"
                      className="h-7 bg-gradient-primary text-primary-foreground text-[11px] shadow-glow"
                      onClick={() => setApprovalTarget({ kind: "milestone", id: m.id, title: m.title })}
                    >
                      Approve
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Invoices */}
        <Section title="Outstanding invoices" subtitle={fmtCurrency(totalUnpaid) + " due"}>
          {data.unpaid_invoices.length === 0 ? (
            <EmptyText>No outstanding invoices. 🎉</EmptyText>
          ) : (
            <div className="space-y-2">
              {data.unpaid_invoices.map((i) => (
                <div key={i.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-card/40 px-4 py-3">
                  <div>
                    <p className="font-display text-sm font-semibold">{i.invoice_number}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Issued {fmtDate(i.issue_date)}
                      {i.due_date && ` · due ${fmtDate(i.due_date)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-base font-semibold gradient-text">{fmtCurrency(Number(i.amount))}</p>
                    <span className={cn(
                      "rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                      i.status === "overdue" ? "bg-destructive/15 text-destructive border-destructive/30" : "bg-warning/15 text-warning border-warning/30"
                    )}>
                      {i.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Activity */}
        <Section title="Recent activity" subtitle="Latest updates">
          {data.recent_activity.length === 0 ? (
            <EmptyText>No activity yet.</EmptyText>
          ) : (
            <ol className="relative space-y-3 border-l border-border/40 pl-5">
              {data.recent_activity.map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[27px] top-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-gradient-primary shadow-glow" />
                  <p className="text-sm">{a.description ?? a.action}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {a.project_name} · {new Date(a.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Section>

        <p className="mt-12 text-center text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60">
          Powered by {w?.name ?? "Injaazh OS"}
        </p>
      </div>

      {/* Approval dialog */}
      <Dialog open={!!approvalTarget} onOpenChange={(o) => { if (!o) { setApprovalTarget(null); setRevisionNotes(""); } }}>
        <DialogContent className="glass border-border/60 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {approvalTarget?.kind === "milestone"
                ? "Approve milestone"
                : approvalTarget?.status === "approved"
                  ? "Approve deliverable"
                  : "Request changes"}
            </DialogTitle>
            <DialogDescription>{approvalTarget?.title}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="approver-name">Your name</Label>
              <Input id="approver-name" value={approverName} onChange={(e) => setApproverName(e.target.value)} className="border-border/60 bg-secondary/40" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="approver-email">Email</Label>
              <Input id="approver-email" type="email" value={approverEmail} onChange={(e) => setApproverEmail(e.target.value)} className="border-border/60 bg-secondary/40" />
            </div>
            {approvalTarget?.kind === "deliverable" && approvalTarget.status === "revision_requested" && (
              <div className="grid gap-1.5">
                <Label htmlFor="revision-notes">What needs to change?</Label>
                <Textarea id="revision-notes" rows={4} value={revisionNotes} onChange={(e) => setRevisionNotes(e.target.value)} className="border-border/60 bg-secondary/40" placeholder="Be specific so the team can iterate quickly…" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalTarget(null)} className="border-border/60">Cancel</Button>
            <Button onClick={submitApproval} disabled={submitting} className="bg-gradient-primary text-primary-foreground shadow-glow">
              {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {approvalTarget?.kind === "deliverable" && approvalTarget.status === "revision_requested" ? "Send request" : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Section = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <motion.section
    initial={{ opacity: 0, y: 8 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    className="mb-10"
  >
    <div className="mb-4 flex items-baseline justify-between">
      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      {subtitle && <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{subtitle}</p>}
    </div>
    {children}
  </motion.section>
);

const EmptyText = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-lg border border-border/40 bg-card/30 py-8 text-center text-xs text-muted-foreground">{children}</p>
);

const SummaryStat = ({ label, value, icon: Icon }: { label: string; value: string; icon: typeof FolderKanban }) => (
  <div className="rounded-xl border border-border/40 bg-card/40 p-4">
    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
      <Icon className="h-3 w-3" /> {label}
    </div>
    <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
  </div>
);

const DeliverableBadge = ({ status }: { status: PortalDeliverable["status"] }) => {
  const map = {
    pending: { cls: "bg-warning/15 text-warning border-warning/30", label: "Pending review" },
    approved: { cls: "bg-success/15 text-success border-success/30", label: "Approved" },
    revision_requested: { cls: "bg-destructive/15 text-destructive border-destructive/30", label: "Changes requested" },
  } as const;
  const m = map[status];
  return (
    <span className={cn("rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", m.cls)}>
      {m.label}
    </span>
  );
};

export default Portal;
