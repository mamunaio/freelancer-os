import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/RichTextEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Save, Send, Copy, ExternalLink, Loader2, Sparkles, StopCircle } from "lucide-react";
import { fmtCurrency } from "@/lib/format";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Proposal = Tables<"proposals">;
type Status = Enums<"proposal_status">;

const ProposalEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState("");
  const [price, setPrice] = useState("0");
  const [validUntil, setValidUntil] = useState("");
  const [status, setStatus] = useState<Status>("draft");
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftCtrl, setDraftCtrl] = useState<AbortController | null>(null);

  const { data: proposal, isLoading } = useQuery({
    queryKey: ["proposal", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*, projects(name, description, tech_stack, budget, deadline), clients(name, company)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as (Proposal & { projects?: any; clients?: any }) | null;
    },
    enabled: !!id,
  });

  const aiDraft = async () => {
    if (!proposal || drafting) return;
    const ctrl = new AbortController();
    setDraftCtrl(ctrl);
    setDrafting(true);
    setScope(""); // clear so streaming replaces
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proposal-draft`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        signal: ctrl.signal,
        body: JSON.stringify({
          project_name: proposal.projects?.name ?? proposal.title,
          client_name: proposal.clients?.name ?? "the client",
          tech_stack: proposal.projects?.tech_stack ?? [],
          budget: Number(price) || Number(proposal.projects?.budget) || 0,
          currency: proposal.currency,
          valid_until: validUntil || proposal.projects?.deadline,
          description: proposal.projects?.description ?? "",
        }),
      });
      if (!resp.ok || !resp.body) {
        const txt = await resp.text();
        throw new Error(txt || `HTTP ${resp.status}`);
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setScope(acc);
            }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }
      toast.success("Draft generated");
    } catch (e: any) {
      if (e.name === "AbortError") toast.info("Draft cancelled");
      else toast.error(e.message ?? "Draft failed");
    } finally {
      setDrafting(false);
      setDraftCtrl(null);
    }
  };


  useEffect(() => {
    if (proposal) {
      setTitle(proposal.title);
      setScope(proposal.scope || "");
      setPrice(String(proposal.price));
      setValidUntil(proposal.valid_until ?? "");
      setStatus(proposal.status);
    }
  }, [proposal]);

  const save = async (newStatus?: Status) => {
    if (!proposal) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("proposals").update({
        title: title.trim(),
        scope,
        price: Number(price) || 0,
        valid_until: validUntil || null,
        status: newStatus ?? status,
        sent_at: newStatus === "sent" && !proposal.sent_at ? new Date().toISOString() : proposal.sent_at,
      }).eq("id", proposal.id);
      if (error) throw error;
      toast.success(newStatus === "sent" ? "Marked as sent" : "Saved");
      qc.invalidateQueries({ queryKey: ["proposal", id] });
      qc.invalidateQueries({ queryKey: ["proposals"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    if (!proposal) return;
    const url = `${window.location.origin}/proposals/share/${proposal.share_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Share link copied");
  };

  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></AppLayout>;
  if (!proposal) return <AppLayout><p className="py-12 text-center text-muted-foreground">Proposal not found.</p></AppLayout>;

  return (
    <AppLayout>
      <Link to="/proposals" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> All proposals
      </Link>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <GlassCard>
          <div className="mb-4 flex items-start gap-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Proposal title"
              className="flex-1 border-0 bg-transparent px-0 text-2xl font-display font-semibold tracking-tight focus-visible:ring-0"
            />
            {drafting ? (
              <Button onClick={() => draftCtrl?.abort()} variant="outline" size="sm" className="border-border/60">
                <StopCircle className="mr-1.5 h-3.5 w-3.5" /> Stop
              </Button>
            ) : (
              <Button onClick={aiDraft} size="sm" className="bg-gradient-primary text-primary-foreground shadow-glow" title="Generate with GPT-4o">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> AI Draft
              </Button>
            )}
          </div>
          <RichTextEditor value={scope} onChange={setScope} placeholder="Outline scope, deliverables, timeline… or click AI Draft" minHeight={420} />
        </GlassCard>

        <div className="space-y-4">
          <GlassCard>
            <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Details</h3>
            <div className="space-y-3">
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                  <SelectTrigger className="border-border/60 bg-secondary/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="viewed">Viewed</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Price ($)</Label>
                <Input type="number" min={0} step={0.01} value={price} onChange={(e) => setPrice(e.target.value)} className="border-border/60 bg-secondary/40" />
              </div>
              <div className="grid gap-1.5">
                <Label>Valid until</Label>
                <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="border-border/60 bg-secondary/40" />
              </div>
              <div className="rounded-md bg-primary/5 border border-primary/20 p-2 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
                <p className="font-display text-2xl font-semibold gradient-text">{fmtCurrency(Number(price))}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              <Button onClick={() => save()} disabled={saving} className="w-full bg-gradient-primary text-primary-foreground shadow-glow">
                {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />} Save
              </Button>
              {proposal.status === "draft" && (
                <Button onClick={() => save("sent")} disabled={saving} variant="outline" className="w-full border-border/60">
                  <Send className="mr-1.5 h-3.5 w-3.5" /> Mark as sent
                </Button>
              )}
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Public link</h3>
            <div className="rounded-md border border-border/40 bg-secondary/30 p-2 text-[10px] text-muted-foreground break-all">
              /proposals/share/{proposal.share_token}
            </div>
            <div className="mt-2 flex gap-2">
              <Button onClick={copyLink} variant="outline" size="sm" className="flex-1 border-border/60">
                <Copy className="mr-1.5 h-3 w-3" /> Copy
              </Button>
              <Button onClick={() => window.open(`/proposals/share/${proposal.share_token}`, "_blank")} variant="outline" size="sm" className="flex-1 border-border/60">
                <ExternalLink className="mr-1.5 h-3 w-3" /> Open
              </Button>
            </div>
            {proposal.viewed_at && <p className="mt-2 text-[10px] text-muted-foreground">Viewed {new Date(proposal.viewed_at).toLocaleString()}</p>}
            {proposal.accepted_at && (
              <p className="mt-2 text-[10px] text-success">
                ✓ Accepted by {proposal.accepted_by_name ?? "client"} ({proposal.accepted_by_email}) on {new Date(proposal.accepted_at).toLocaleString()}
              </p>
            )}
          </GlassCard>
        </div>
      </div>
    </AppLayout>
  );
};

export default ProposalEditor;
