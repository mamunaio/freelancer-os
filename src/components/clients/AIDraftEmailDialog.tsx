import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Client = Tables<"clients">;

type Template = "status_update" | "meeting_summary" | "follow_up";
type Tone = "professional" | "friendly" | "direct";

interface Props {
  open: boolean;
  onClose: () => void;
  client: Client;
  onDraft: (draft: { subject: string; body: string }) => void;
}

const TEMPLATE_LABELS: Record<Template, string> = {
  status_update: "Weekly Status Update",
  meeting_summary: "Meeting Summary (from notes)",
  follow_up: "Follow-up Email",
};

const TONE_LABELS: Record<Tone, string> = {
  professional: "Professional",
  friendly: "Friendly",
  direct: "Direct",
};

export function AIDraftEmailDialog({ open, onClose, client, onDraft }: Props) {
  const [template, setTemplate] = useState<Template>("follow_up");
  const [tone, setTone] = useState<Tone>("professional");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-draft-email", {
        body: { client_id: client.id, template, tone, notes: template === "meeting_summary" ? notes : undefined },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const subject = (data as any)?.subject ?? "";
      const body = (data as any)?.body ?? "";
      if (!subject || !body) throw new Error("Empty draft returned");
      onDraft({ subject, body });
      toast.success("Draft ready — review before sending");
      handleClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to draft email");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNotes("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="glass border-border/60 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Draft Email
          </DialogTitle>
          <DialogDescription>
            GPT-4o will draft a tailored email for <strong>{client.name}</strong>. You'll review it in the compose window.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>Template</Label>
            <Select value={template} onValueChange={(v) => setTemplate(v as Template)}>
              <SelectTrigger className="border-border/60 bg-secondary/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TEMPLATE_LABELS) as Template[]).map((k) => (
                  <SelectItem key={k} value={k}>{TEMPLATE_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Tone</Label>
            <Select value={tone} onValueChange={(v) => setTone(v as Tone)}>
              <SelectTrigger className="border-border/60 bg-secondary/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TONE_LABELS) as Tone[]).map((k) => (
                  <SelectItem key={k} value={k}>{TONE_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {template === "meeting_summary" && (
            <div className="grid gap-1.5">
              <Label>Raw meeting notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                placeholder="Paste your raw notes — AI will extract a summary, decisions, and action items."
                className="border-border/60 bg-secondary/40 text-xs"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="border-border/60">Cancel</Button>
          <Button
            onClick={generate}
            disabled={loading || (template === "meeting_summary" && !notes.trim())}
            className="bg-gradient-primary text-primary-foreground shadow-glow"
          >
            {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
            {loading ? "Drafting…" : "Draft email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
