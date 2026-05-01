import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/AppLayout";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { fmtCurrency, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft, Mail, Phone, Building2, DollarSign, FolderKanban,
  Send, Loader2, FileText, Activity, MessageSquare, CheckCircle2, XCircle, Clock, Sparkles, Link2,
} from "lucide-react";
import { AIDraftEmailDialog } from "@/components/clients/AIDraftEmailDialog";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Client = Tables<"clients">;
type Project = Tables<"projects">;
type FinanceEntry = Tables<"finance_entries">;
type EmailTemplate = Tables<"email_templates">;
type EmailLog = Tables<"email_log">;
type Status = Enums<"client_status">;

const statusStyles: Record<Status, string> = {
  lead: "bg-warning/15 text-warning border-warning/30",
  active: "bg-success/15 text-success border-success/30",
  completed: "bg-primary/15 text-primary border-primary/30",
};

const projectStatusStyles: Record<Enums<"project_status">, string> = {
  planning: "bg-muted text-muted-foreground border-border",
  in_progress: "bg-primary/15 text-primary border-primary/30",
  review: "bg-warning/15 text-warning border-warning/30",
  completed: "bg-success/15 text-success border-success/30",
  on_hold: "bg-destructive/15 text-destructive border-destructive/30",
};

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeDraft, setComposeDraft] = useState<{ subject: string; body: string } | null>(null);
  const [aiDraftOpen, setAiDraftOpen] = useState(false);

  const { data: client, isLoading } = useQuery({
    queryKey: ["client-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as Client | null;
    },
    enabled: !!id,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["client-projects", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("client_id", id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!id,
  });

  const { data: incomeEntries = [] } = useQuery({
    queryKey: ["client-income", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_entries")
        .select("*")
        .eq("client_id", id!)
        .eq("kind", "income")
        .order("occurred_on", { ascending: false });
      if (error) throw error;
      return data as FinanceEntry[];
    },
    enabled: !!id,
  });

  const { data: emailLog = [] } = useQuery({
    queryKey: ["client-emails", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_log").select("*").eq("client_id", id!).order("sent_at", { ascending: false });
      if (error) throw error;
      return data as EmailLog[];
    },
    enabled: !!id,
  });

  const saveNotes = useMutation({
    mutationFn: async (notes: string) => {
      const { error } = await supabase.from("clients").update({ notes }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notes saved");
      qc.invalidateQueries({ queryKey: ["client-detail", id] });
    },
    onError: (e: Error) => toast.error(e.message),
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

  if (!client) {
    return (
      <AppLayout>
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Client not found.</p>
          <Button onClick={() => navigate("/clients")} variant="outline" className="mt-4">
            Back to clients
          </Button>
        </div>
      </AppLayout>
    );
  }

  const totalIncome = incomeEntries.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <AppLayout>
      {/* Back nav */}
      <Link to="/clients" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> All clients
      </Link>

      {/* Header */}
      <GlassCard className="mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary text-lg font-semibold text-primary-foreground shadow-glow">
              {client.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{client.name}</h1>
              {client.company && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" /> {client.company}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {client.email && (
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {client.email}</span>
                )}
                {client.phone && (
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {client.phone}</span>
                )}
                <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", statusStyles[client.status])}>
                  {client.status}
                </span>
              </div>
              {client.tags && client.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {client.tags.map((t) => (
                    <span key={t} className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <Button
              variant="outline" size="sm"
              className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
              onClick={async () => {
                const url = `${window.location.origin}/portal/${encodeURIComponent(client.portal_token)}`;
                try { await navigator.clipboard.writeText(url); toast.success("Portal link copied", { description: url }); }
                catch { toast.error("Could not copy. Link: " + url); }
              }}
            >
              <Link2 className="mr-1.5 h-3.5 w-3.5" /> Copy portal link
            </Button>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Revenue</p>
              <p className="font-display text-3xl font-semibold gradient-text">{fmtCurrency(Number(client.total_revenue))}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{projects.length} projects · {incomeEntries.length} payments</p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-secondary/40">
          <TabsTrigger value="overview"><FolderKanban className="mr-1.5 h-3.5 w-3.5" />Overview</TabsTrigger>
          <TabsTrigger value="email"><Mail className="mr-1.5 h-3.5 w-3.5" />Email</TabsTrigger>
          <TabsTrigger value="activity"><Activity className="mr-1.5 h-3.5 w-3.5" />Activity</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-5 grid gap-5 lg:grid-cols-3">
          {/* Projects */}
          <GlassCard className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">Projects</h2>
              <Badge variant="secondary" className="text-[10px]">{projects.length}</Badge>
            </div>
            {projects.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No projects yet for this client.</p>
            ) : (
              <div className="space-y-3">
                {projects.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-border/40 bg-secondary/20 p-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{p.name}</p>
                        {p.description && (
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{p.description}</p>
                        )}
                      </div>
                      <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", projectStatusStyles[p.status])}>
                        {p.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Progress</span>
                        <span>{p.progress}%</span>
                      </div>
                      <Progress value={p.progress} className="h-1.5" />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{p.deadline ? `Due ${fmtDate(p.deadline)}` : "No deadline"}</span>
                      {p.budget != null && <span>Budget: {fmtCurrency(Number(p.budget))}</span>}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Income */}
          <GlassCard>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">Income</h2>
              <Badge variant="secondary" className="text-[10px]">{fmtCurrency(totalIncome)}</Badge>
            </div>
            {incomeEntries.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No income entries.</p>
            ) : (
              <div className="space-y-2">
                {incomeEntries.map((e) => (
                  <div key={e.id} className="flex items-center justify-between rounded-md bg-secondary/30 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{e.description || e.category}</p>
                      <p className="text-[10px] text-muted-foreground">{fmtDate(e.occurred_on)}</p>
                    </div>
                    <span className="font-display text-sm font-semibold text-success">+{fmtCurrency(Number(e.amount))}</span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </TabsContent>

        {/* EMAIL */}
        <TabsContent value="email" className="mt-5">
          <GlassCard>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-semibold">Email history</h2>
                <p className="text-[11px] text-muted-foreground">{emailLog.length} sent</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setAiDraftOpen(true)}
                  disabled={!client.email}
                  size="sm"
                  variant="outline"
                  className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> AI Draft
                </Button>
                <Button
                  onClick={() => { setComposeDraft(null); setComposeOpen(true); }}
                  disabled={!client.email}
                  size="sm"
                  className="bg-gradient-primary text-primary-foreground shadow-glow"
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" /> Compose
                </Button>
              </div>
            </div>

            {!client.email && (
              <p className="rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
                Add an email address to this client to enable sending.
              </p>
            )}

            {emailLog.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">No emails yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {emailLog.map((log) => (
                  <div key={log.id} className="rounded-lg border border-border/40 bg-secondary/20 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{log.subject}</p>
                        <p className="text-[10px] text-muted-foreground">
                          To {log.to_email} · {fmtDate(log.sent_at)} {new Date(log.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <StatusBadge status={log.status} />
                    </div>
                    <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-[11px] text-muted-foreground">{log.body}</p>
                    {log.error && (
                      <p className="mt-2 rounded bg-destructive/10 px-2 py-1 text-[10px] text-destructive">{log.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <ComposeEmailDialog
            open={composeOpen}
            onClose={() => { setComposeOpen(false); setComposeDraft(null); }}
            client={client}
            initialDraft={composeDraft}
            onSent={() => qc.invalidateQueries({ queryKey: ["client-emails", id] })}
          />

          <AIDraftEmailDialog
            open={aiDraftOpen}
            onClose={() => setAiDraftOpen(false)}
            client={client}
            onDraft={(d) => { setComposeDraft(d); setComposeOpen(true); }}
          />
        </TabsContent>

        {/* ACTIVITY */}
        <TabsContent value="activity" className="mt-5 grid gap-5 lg:grid-cols-3">
          <GlassCard className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Notes
              </h2>
            </div>
            <NotesEditor initial={client.notes ?? ""} onSave={(v) => saveNotes.mutate(v)} saving={saveNotes.isPending} />
          </GlassCard>

          <GlassCard>
            <h2 className="mb-4 font-display text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" /> Timeline
            </h2>
            <ActivityTimeline
              client={client}
              projects={projects}
              incomeEntries={incomeEntries}
              emailLog={emailLog}
            />
          </GlassCard>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: typeof CheckCircle2; cls: string }> = {
    sent: { icon: CheckCircle2, cls: "bg-success/15 text-success border-success/30" },
    failed: { icon: XCircle, cls: "bg-destructive/15 text-destructive border-destructive/30" },
    draft: { icon: Clock, cls: "bg-warning/15 text-warning border-warning/30" },
  };
  const m = map[status] || map.draft;
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase", m.cls)}>
      <Icon className="h-2.5 w-2.5" /> {status}
    </span>
  );
}

function NotesEditor({ initial, onSave, saving }: { initial: string; onSave: (v: string) => void; saving: boolean }) {
  const [val, setVal] = useState(initial);
  const dirty = val !== initial;
  return (
    <div className="space-y-3">
      <Textarea
        value={val}
        onChange={(e) => setVal(e.target.value)}
        rows={10}
        placeholder="Add notes about this client — meetings, preferences, deal context…"
        className="border-border/60 bg-secondary/40 text-sm"
      />
      <div className="flex justify-end">
        <Button onClick={() => onSave(val)} disabled={!dirty || saving} size="sm" className="bg-gradient-primary text-primary-foreground shadow-glow">
          {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Save notes
        </Button>
      </div>
    </div>
  );
}

interface TimelineItem { ts: string; title: string; meta: string; type: string; }

function ActivityTimeline({
  client, projects, incomeEntries, emailLog,
}: {
  client: Client;
  projects: Project[];
  incomeEntries: FinanceEntry[];
  emailLog: EmailLog[];
}) {
  const items: TimelineItem[] = useMemo(() => {
    const out: TimelineItem[] = [
      { ts: client.created_at, title: "Client added", meta: client.name, type: "client" },
    ];
    projects.forEach((p) => out.push({ ts: p.created_at, title: "Project created", meta: p.name, type: "project" }));
    incomeEntries.forEach((e) => out.push({
      ts: e.created_at, title: `Payment +${fmtCurrency(Number(e.amount))}`, meta: e.description || e.category, type: "income",
    }));
    emailLog.forEach((e) => out.push({
      ts: e.sent_at, title: `Email ${e.status}`, meta: e.subject, type: "email",
    }));
    return out.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, 30);
  }, [client, projects, incomeEntries, emailLog]);

  const colors: Record<string, string> = {
    client: "bg-primary",
    project: "bg-accent",
    income: "bg-success",
    email: "bg-warning",
  };

  return (
    <div className="relative space-y-3 pl-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-px before:bg-border/40">
      {items.map((it, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.02 }}
          className="relative"
        >
          <span className={cn("absolute -left-3.5 top-1 h-2 w-2 rounded-full ring-2 ring-background", colors[it.type] || "bg-muted")} />
          <p className="text-xs font-medium">{it.title}</p>
          <p className="truncate text-[10px] text-muted-foreground">{it.meta}</p>
          <p className="text-[10px] text-muted-foreground/70">
            {new Date(it.ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

function ComposeEmailDialog({
  open, onClose, client, onSent, initialDraft,
}: {
  open: boolean;
  onClose: () => void;
  client: Client;
  onSent: () => void;
  initialDraft?: { subject: string; body: string } | null;
}) {
  const [templateId, setTemplateId] = useState<string>("none");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  // Apply incoming AI draft when dialog opens
  useEffect(() => {
    if (open && initialDraft) {
      setSubject(initialDraft.subject);
      setBody(initialDraft.body);
      setTemplateId("none");
    }
  }, [open, initialDraft]);

  const { data: templates = [] } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_templates").select("*").order("name");
      if (error) throw error;
      return data as EmailTemplate[];
    },
    enabled: open,
  });

  const interpolate = (str: string) =>
    str
      .replace(/\{\{\s*name\s*\}\}/g, client.name)
      .replace(/\{\{\s*company\s*\}\}/g, client.company ?? "")
      .replace(/\{\{\s*email\s*\}\}/g, client.email ?? "");

  const applyTemplate = (tid: string) => {
    setTemplateId(tid);
    if (tid === "none") return;
    const t = templates.find((x) => x.id === tid);
    if (t) {
      setSubject(interpolate(t.subject));
      setBody(interpolate(t.body));
    }
  };

  const send = async () => {
    if (!client.email) {
      toast.error("Client has no email address");
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and body are required");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-client-email", {
        body: {
          client_id: client.id,
          template_id: templateId === "none" ? null : templateId,
          to: client.email,
          subject,
          body,
        },
      });
      if (error) throw error;
      if (data?.status === "draft") toast.warning(data.error || "Email saved as draft");
      else if (data?.status === "failed") toast.error(data.error || "Send failed (logged)");
      else toast.success("Email sent");
      onSent();
      onClose();
      setSubject(""); setBody(""); setTemplateId("none");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass border-border/60 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Compose email</DialogTitle>
          <DialogDescription>To {client.email}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>Template</Label>
            <Select value={templateId} onValueChange={applyTemplate}>
              <SelectTrigger className="border-border/60 bg-secondary/40">
                <SelectValue placeholder="Pick a template (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Blank —</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="flex items-center gap-1.5"><FileText className="h-3 w-3" /> {t.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="border-border/60 bg-secondary/40" />
          </div>
          <div className="grid gap-1.5">
            <Label>Body</Label>
            <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} className="border-border/60 bg-secondary/40 font-mono text-xs" />
            <p className="text-[10px] text-muted-foreground">
              Variables: <code>{`{{name}}`}</code>, <code>{`{{company}}`}</code>, <code>{`{{email}}`}</code>
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-border/60">Cancel</Button>
          <Button onClick={send} disabled={sending} className="bg-gradient-primary text-primary-foreground shadow-glow">
            {sending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            <Send className="mr-1.5 h-3.5 w-3.5" /> Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ClientDetail;
