import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PDFDownloadLink, pdf } from "@react-pdf/renderer";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, FileDown, Save, Receipt } from "lucide-react";
import { fmtCurrency } from "@/lib/format";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { InvoicePDF, type InvoiceLineItem } from "@/components/InvoicePDF";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Project = Tables<"projects">;
type Client = Tables<"clients">;
type Invoice = Tables<"invoices">;
type Status = Enums<"invoice_status">;

interface Props {
  open: boolean;
  onClose: () => void;
  project: Project & { clients?: { name: string } | null };
  existingInvoice?: Invoice | null;
}

export function InvoiceDialog({ open, onClose, project, existingInvoice }: Props) {
  const qc = useQueryClient();
  const { settings } = useWorkspace();
  const [items, setItems] = useState<InvoiceLineItem[]>([]);
  const [taxRate, setTaxRate] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<Status>("draft");
  const [notes, setNotes] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("Bank transfer to account ending in 1234.\nReference invoice number on payment.");
  const [saving, setSaving] = useState(false);

  // Fetch client + finance entries to autofill
  const { data: client } = useQuery({
    queryKey: ["invoice-client", project.client_id],
    queryFn: async () => {
      if (!project.client_id) return null;
      const { data, error } = await supabase.from("clients").select("*").eq("id", project.client_id).maybeSingle();
      if (error) throw error;
      return data as Client | null;
    },
    enabled: open && !!project.client_id,
  });

  const { data: financeIncome = [] } = useQuery({
    queryKey: ["invoice-finance", project.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_entries")
        .select("*")
        .eq("project_id", project.id)
        .eq("kind", "income")
        .order("occurred_on", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Initialize items when dialog opens
  useEffect(() => {
    if (!open) return;
    if (existingInvoice) {
      setItems((existingInvoice.line_items as unknown as InvoiceLineItem[]) || []);
      setTaxRate(Number(existingInvoice.tax_rate) || 0);
      setDueDate(existingInvoice.due_date ?? "");
      setStatus(existingInvoice.status);
      setNotes(existingInvoice.notes ?? "");
      setPaymentInstructions(existingInvoice.payment_instructions ?? "");
    } else {
      // Auto-fill from finance entries
      if (financeIncome.length > 0) {
        setItems(
          financeIncome.map((f) => ({
            description: f.description || `${project.name} — ${f.category}`,
            quantity: 1,
            rate: Number(f.amount),
            amount: Number(f.amount),
          }))
        );
      } else {
        setItems([{ description: `${project.name} — services rendered`, quantity: 1, rate: Number(project.budget ?? 0), amount: Number(project.budget ?? 0) }]);
      }
      setTaxRate(0);
      setDueDate(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
      setStatus("draft");
      setNotes("");
    }
  }, [open, existingInvoice, financeIncome, project.id, project.name, project.budget]);

  const updateItem = (idx: number, patch: Partial<InvoiceLineItem>) => {
    setItems((prev) => {
      const next = [...prev];
      const merged = { ...next[idx], ...patch };
      merged.amount = Number(merged.quantity) * Number(merged.rate);
      next[idx] = merged;
      return next;
    });
  };

  const addItem = () => setItems((p) => [...p, { description: "", quantity: 1, rate: 0, amount: 0 }]);
  const removeItem = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx));

  const subtotal = items.reduce((s, it) => s + Number(it.amount || 0), 0);
  const total = subtotal + subtotal * (taxRate / 100);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        project_id: project.id,
        client_id: project.client_id,
        amount: total,
        tax_rate: taxRate,
        status,
        due_date: dueDate || null,
        notes: notes || null,
        payment_instructions: paymentInstructions || null,
        line_items: items as unknown as Tables<"invoices">["line_items"],
      };
      if (existingInvoice) {
        const { error } = await supabase.from("invoices").update(payload).eq("id", existingInvoice.id);
        if (error) throw error;
        toast.success(`Invoice ${existingInvoice.invoice_number} updated`);
      } else {
        const { data, error } = await supabase.from("invoices").insert(payload).select("invoice_number").single();
        if (error) throw error;
        toast.success(`Invoice ${data?.invoice_number ?? "created"} created`);
      }
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["project-invoices", project.id] });
      qc.invalidateQueries({ queryKey: ["project-activity", project.id] });
      qc.invalidateQueries({ queryKey: ["finance"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      // Force-refetch projects so billed amount + PAID badge update immediately
      await qc.refetchQueries({ queryKey: ["projects"], type: "active" });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const pdfDoc = (
    <InvoicePDF
      invoiceNumber={existingInvoice?.invoice_number ?? "PREVIEW"}
      issueDate={existingInvoice?.issue_date ?? new Date().toISOString().slice(0, 10)}
      dueDate={dueDate}
      workspace={{ name: settings?.name ?? "Workspace", logoUrl: settings?.logo_url, tagline: settings?.tagline }}
      client={client ? { name: client.name, company: client.company, email: client.email, phone: client.phone } : null}
      projectName={project.name}
      lineItems={items}
      subtotal={subtotal}
      taxRate={taxRate}
      total={total}
      notes={notes}
      paymentInstructions={paymentInstructions}
      status={status}
    />
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass border-border/60 max-h-[90vh] sm:max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            {existingInvoice ? `Edit ${existingInvoice.invoice_number}` : "Generate Invoice"}
          </DialogTitle>
          <DialogDescription>
            {project.name} · {client?.name ?? "No client"}
            {financeIncome.length > 0 && !existingInvoice && (
              <span className="ml-2 text-primary">· Pre-filled from {financeIncome.length} finance entries</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto pr-1 max-h-[60vh] space-y-4">
          {/* Status & Due */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger className="border-border/60 bg-secondary/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              {existingInvoice && status !== "paid" && (
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={() => setStatus("paid")}
                  className="mt-1 h-7 border-success/40 bg-success/10 text-success hover:bg-success/20 text-xs"
                >
                  ✓ Mark as Paid
                </Button>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="border-border/60 bg-secondary/40" />
            </div>
          </div>

          {/* Line items */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Line items</Label>
              <Button type="button" size="sm" variant="outline" onClick={addItem} className="h-7 border-border/60 text-xs">
                <Plus className="mr-1 h-3 w-3" /> Add row
              </Button>
            </div>
            <div className="rounded-md border border-border/40 bg-secondary/20">
              <div className="grid grid-cols-12 gap-2 border-b border-border/40 px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                <span className="col-span-6">Description</span>
                <span className="col-span-1 text-center">Qty</span>
                <span className="col-span-2 text-right">Rate</span>
                <span className="col-span-2 text-right">Amount</span>
                <span className="col-span-1" />
              </div>
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 border-b border-border/30 px-2 py-1.5 last:border-0 items-center">
                  <Input
                    value={it.description}
                    onChange={(e) => updateItem(i, { description: e.target.value })}
                    className="col-span-6 h-8 border-border/40 bg-background/40 text-xs"
                    placeholder="Description"
                  />
                  <Input
                    type="number" min={0} step={0.5}
                    value={it.quantity}
                    onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                    className="col-span-1 h-8 border-border/40 bg-background/40 text-xs text-center"
                  />
                  <Input
                    type="number" min={0} step={0.01}
                    value={it.rate}
                    onChange={(e) => updateItem(i, { rate: Number(e.target.value) })}
                    className="col-span-2 h-8 border-border/40 bg-background/40 text-xs text-right"
                  />
                  <span className="col-span-2 text-right text-xs font-semibold tabular-nums">{fmtCurrency(it.amount)}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeItem(i)} className="col-span-1 h-7 w-7 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Totals + tax */}
          <div className="flex items-end justify-end gap-4">
            <div className="grid gap-1.5">
              <Label>Tax rate (%)</Label>
              <Input type="number" min={0} max={100} step={0.5} value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} className="h-8 w-24 border-border/60 bg-secondary/40 text-xs" />
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Subtotal {fmtCurrency(subtotal)}</p>
              <p className="font-display text-2xl font-semibold gradient-text tabular-nums">{fmtCurrency(total)}</p>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Payment instructions</Label>
            <Textarea rows={2} value={paymentInstructions} onChange={(e) => setPaymentInstructions(e.target.value)} className="border-border/60 bg-secondary/40 text-xs" />
          </div>
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="border-border/60 bg-secondary/40 text-xs" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-border/60">Cancel</Button>
          <PDFDownloadLink document={pdfDoc} fileName={`${existingInvoice?.invoice_number ?? "invoice-preview"}.pdf`}>
            {({ loading }) => (
              <Button variant="outline" disabled={loading || items.length === 0} className="border-border/60">
                {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileDown className="mr-1.5 h-3.5 w-3.5" />}
                {loading ? "Building PDF…" : "Download PDF"}
              </Button>
            )}
          </PDFDownloadLink>
          <Button onClick={save} disabled={saving || items.length === 0} className="bg-gradient-primary text-primary-foreground shadow-glow">
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            {existingInvoice ? "Save changes" : "Create invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
