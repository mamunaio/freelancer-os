import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, FileSignature, Sparkles } from "lucide-react";
import { fmtCurrency, fmtDate } from "@/lib/format";
import { toast } from "sonner";

interface PublicProposal {
  id: string;
  title: string;
  scope: string;
  price: number;
  currency: string;
  status: string;
  valid_until: string | null;
  accepted_at: string | null;
  workspace_name: string | null;
  workspace_logo_url: string | null;
  client_name: string | null;
  client_company: string | null;
}

const ProposalView = () => {
  const { token } = useParams<{ token: string }>();
  const [proposal, setProposal] = useState<PublicProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("get_proposal_by_token", { _token: token });
        if (error) throw error;
        const row = (data as PublicProposal[])?.[0] ?? null;
        setProposal(row);
        if (row) {
          await supabase.rpc("mark_proposal_viewed", { _token: token });
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load proposal");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const accept = async () => {
    if (!token) return;
    if (!name.trim() || !email.trim()) {
      toast.error("Please enter your name and email");
      return;
    }
    setAccepting(true);
    try {
      const { data, error } = await supabase.rpc("accept_proposal", {
        _token: token, _name: name.trim(), _email: email.trim(),
      });
      if (error) throw error;
      const result = data as { ok: boolean; error?: string; already?: boolean };
      if (!result.ok) throw new Error(result.error ?? "Accept failed");
      toast.success(result.already ? "Already accepted" : "Proposal accepted! 🎉");
      // Reload
      const { data: refreshed } = await supabase.rpc("get_proposal_by_token", { _token: token });
      setProposal((refreshed as PublicProposal[])?.[0] ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to accept");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
        <div>
          <FileSignature className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 font-display text-2xl font-semibold">Proposal not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">This link may have expired or been revoked.</p>
        </div>
      </div>
    );
  }

  const accepted = proposal.status === "accepted" || !!proposal.accepted_at;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
        {/* Brand header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex items-center gap-3"
        >
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-gradient-primary shadow-glow">
            {proposal.workspace_logo_url ? (
              <img src={proposal.workspace_logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Proposal from</p>
            <p className="font-display text-base font-semibold">{proposal.workspace_name ?? "Studio"}</p>
          </div>
        </motion.div>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Prepared for {proposal.client_name ?? "you"}{proposal.client_company ? ` · ${proposal.client_company}` : ""}</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">{proposal.title}</h1>
          <div className="mt-6 flex flex-wrap items-end gap-6 border-y border-border/40 py-5">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Investment</p>
              <p className="font-display text-3xl font-semibold gradient-text">{fmtCurrency(Number(proposal.price))}</p>
            </div>
            {proposal.valid_until && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Valid until</p>
                <p className="text-sm font-semibold">{fmtDate(proposal.valid_until)}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Scope */}
        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="prose prose-sm dark:prose-invert mt-10 max-w-none prose-headings:font-display"
          dangerouslySetInnerHTML={{ __html: proposal.scope || "<p><em>No scope provided yet.</em></p>" }}
        />

        {/* Accept */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-background p-6 md:p-8"
        >
          {accepted ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
              <h2 className="mt-3 font-display text-xl font-semibold">Proposal accepted</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Thank you! We'll be in touch shortly to kick off.
                {proposal.accepted_at && ` · Accepted ${new Date(proposal.accepted_at).toLocaleString()}`}
              </p>
            </div>
          ) : (
            <>
              <h2 className="font-display text-xl font-semibold">Ready to move forward?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Confirm your details below to accept this proposal.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="name">Your name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="border-border/60 bg-secondary/40" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="border-border/60 bg-secondary/40" />
                </div>
              </div>
              <Button onClick={accept} disabled={accepting} size="lg" className="mt-5 w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                {accepting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
                I accept this proposal
              </Button>
            </>
          )}
        </motion.div>

        <p className="mt-10 text-center text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60">
          Powered by {proposal.workspace_name ?? "Injaazh OS"}
        </p>
      </div>
    </div>
  );
};

export default ProposalView;
