import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/GlassCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Wallet, Pencil, Trash2, Loader2, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, BarChart3, ListOrdered, Compass, FileDown, FileText, Repeat } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmtCurrencyDetailed, fmtDate } from "@/lib/format";
import { FinanceDashboard } from "@/components/finance/FinanceDashboard";
import { ForecastTab } from "@/components/finance/ForecastTab";
import { DateRangePicker } from "@/components/finance/DateRangePicker";
import { PLReportPDF } from "@/components/finance/PLReportPDF";
import { useWorkspace } from "@/contexts/WorkspaceContext";

import { pdf } from "@react-pdf/renderer";
import Papa from "papaparse";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Entry = Tables<"finance_entries">;
type Kind = Enums<"finance_kind">;
type Category = Enums<"finance_category">;
type Recurring = Enums<"recurring_frequency">;
type TaxCat = Enums<"tax_category">;

const incomeCategories: { value: Category; label: string }[] = [
  { value: "invoice", label: "Invoice" },
  { value: "freelance", label: "Freelance" },
  { value: "other_income", label: "Other" },
];
const expenseCategories: { value: Category; label: string }[] = [
  { value: "subscription", label: "Subscription" },
  { value: "ads", label: "Ads" },
  { value: "tools", label: "Tools" },
  { value: "other_expense", label: "Other" },
];
const categoryLabel: Record<Category, string> = {
  invoice: "Invoice", freelance: "Freelance", other_income: "Other",
  subscription: "Subscription", ads: "Ads", tools: "Tools", other_expense: "Other",
};
const taxCategories: { value: TaxCat; label: string }[] = [
  { value: "software", label: "Software" },
  { value: "office", label: "Office" },
  { value: "travel", label: "Travel" },
  { value: "marketing", label: "Marketing" },
  { value: "other", label: "Other" },
];

interface Form {
  kind: Kind;
  category: Category;
  amount: string;
  description: string;
  occurred_on: string;
  client_id: string;
  project_id: string;
  recurring: Recurring;
  tax_deductible: boolean;
  tax_category: TaxCat | "none";
}
const today = () => new Date().toISOString().slice(0, 10);
const empty: Form = {
  kind: "income", category: "invoice", amount: "", description: "",
  occurred_on: today(), client_id: "none", project_id: "none",
  recurring: "none", tax_deductible: false, tax_category: "none",
};

// Auto-generated finance entries from paid invoices are tagged "[invoice:<uuid>] ..."
// in their description by the DB trigger sync_invoice_to_finance.
const INVOICE_TAG_RE = /^\[invoice:[0-9a-f-]+\]\s*/i;
const isInvoiceAuto = (e: { description: string | null }) =>
  !!e.description && INVOICE_TAG_RE.test(e.description);
const cleanDescription = (d: string | null | undefined) =>
  (d ?? "").replace(INVOICE_TAG_RE, "").trim();

const Finance = () => {
  const qc = useQueryClient();
  const { settings } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [filter, setFilter] = useState<"all" | Kind>("all");
  const [view, setView] = useState<"dashboard" | "ledger" | "forecast">("dashboard");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["finance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_entries")
        .select("*, clients(id, name), projects(id, name)")
        .order("occurred_on", { ascending: false });
      if (error) throw error;
      return data as (Entry & { clients: { id: string; name: string } | null; projects: { id: string; name: string } | null })[];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-mini"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-mini"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const totals = useMemo(() => {
    const src = !startDate && !endDate ? entries : entries.filter((e) => {
      const d = new Date(e.occurred_on);
      if (startDate && d < startDate) return false;
      if (endDate) {
        const eod = new Date(endDate); eod.setHours(23, 59, 59, 999);
        if (d > eod) return false;
      }
      return true;
    });
    const income = src.filter((e) => e.kind === "income").reduce((s, e) => s + Number(e.amount), 0);
    const expense = src.filter((e) => e.kind === "expense").reduce((s, e) => s + Number(e.amount), 0);
    return { income, expense, net: income - expense };
  }, [entries, startDate, endDate]);

  const upsert = useMutation({
    mutationFn: async () => {
      const amt = Number(form.amount);
      if (!amt || amt <= 0) throw new Error("Amount must be greater than zero");
      // Auto-link client from project if client not chosen explicitly
      let clientId: string | null = form.client_id === "none" ? null : form.client_id;
      const projectId: string | null = form.project_id === "none" ? null : form.project_id;
      if (!clientId && projectId) {
        const proj = projects.find((p) => p.id === projectId);
        if (proj?.client_id) clientId = proj.client_id;
      }
      const payload = {
        kind: form.kind,
        category: form.category,
        amount: amt,
        description: form.description.trim() || null,
        occurred_on: form.occurred_on,
        client_id: clientId,
        project_id: projectId,
        recurring: form.recurring,
        tax_deductible: form.kind === "expense" ? form.tax_deductible : false,
        tax_category: form.kind === "expense" && form.tax_category !== "none" ? form.tax_category : null,
      };
      if (editing) {
        const { error } = await supabase.from("finance_entries").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("finance_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Entry updated" : "Entry added");
      qc.invalidateQueries({ queryKey: ["finance"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      setOpen(false); setEditing(null); setForm({ ...empty, occurred_on: today() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entry removed");
      qc.invalidateQueries({ queryKey: ["finance"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startEdit = (e: Entry) => {
    setEditing(e);
    setForm({
      kind: e.kind, category: e.category, amount: String(e.amount),
      description: e.description ?? "", occurred_on: e.occurred_on,
      client_id: e.client_id ?? "none", project_id: e.project_id ?? "none",
      recurring: e.recurring ?? "none",
      tax_deductible: e.tax_deductible ?? false,
      tax_category: e.tax_category ?? "none",
    });
    setOpen(true);
  };
  const startCreate = (kind: Kind = "income") => {
    setEditing(null);
    setForm({ ...empty, kind, category: kind === "income" ? "invoice" : "subscription", occurred_on: today() });
    setOpen(true);
  };

  // Apply date range filter
  const dateFiltered = useMemo(() => {
    if (!startDate && !endDate) return entries;
    return entries.filter((e) => {
      const d = new Date(e.occurred_on);
      if (startDate && d < startDate) return false;
      if (endDate) {
        const endOfDay = new Date(endDate); endOfDay.setHours(23, 59, 59, 999);
        if (d > endOfDay) return false;
      }
      return true;
    });
  }, [entries, startDate, endDate]);

  const filtered = filter === "all" ? dateFiltered : dateFiltered.filter((e) => e.kind === filter);
  const cats = form.kind === "income" ? incomeCategories : expenseCategories;

  // === Exports ===
  const exportCSV = () => {
    const rows = filtered.map((e) => ({
      date: e.occurred_on,
      kind: e.kind,
      category: categoryLabel[e.category],
      description: e.description ?? "",
      client: e.clients?.name ?? "",
      project: e.projects?.name ?? "",
      amount: Number(e.amount),
      recurring: e.recurring ?? "none",
      tax_deductible: e.tax_deductible ? "yes" : "no",
      tax_category: e.tax_category ?? "",
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const range = startDate || endDate
      ? `_${(startDate ?? new Date()).toISOString().slice(0, 10)}_to_${(endDate ?? new Date()).toISOString().slice(0, 10)}`
      : "";
    a.href = url;
    a.download = `ledger${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} entr${rows.length === 1 ? "y" : "ies"}`);
  };

  const exportPDF = async () => {
    setExporting(true);
    try {
      const incomeRows = filtered.filter((e) => e.kind === "income");
      const expenseRows = filtered.filter((e) => e.kind === "expense");
      const income = incomeRows.reduce((s, e) => s + Number(e.amount), 0);
      const expense = expenseRows.reduce((s, e) => s + Number(e.amount), 0);
      const net = income - expense;
      const margin = income > 0 ? (net / income) * 100 : 0;

      const byClient = new Map<string, number>();
      for (const e of incomeRows) {
        const name = e.clients?.name ?? "Unassigned";
        byClient.set(name, (byClient.get(name) ?? 0) + Number(e.amount));
      }
      const incomeByClient = Array.from(byClient.entries())
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);

      const byCat = new Map<string, number>();
      for (const e of expenseRows) {
        const name = categoryLabel[e.category];
        byCat.set(name, (byCat.get(name) ?? 0) + Number(e.amount));
      }
      const expenseByCategory = Array.from(byCat.entries())
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);

      const sortedDates = filtered.map((e) => e.occurred_on).sort();
      const rangeStart = startDate?.toISOString().slice(0, 10)
        ?? sortedDates[0]
        ?? today();
      const rangeEnd = endDate?.toISOString().slice(0, 10)
        ?? sortedDates[sortedDates.length - 1]
        ?? today();

      const doc = (
        <PLReportPDF
          workspace={{
            name: settings?.name ?? "Workspace",
            logoUrl: settings?.logo_url,
            tagline: settings?.tagline,
          }}
          startDate={rangeStart}
          endDate={rangeEnd}
          income={income}
          expense={expense}
          net={net}
          margin={margin}
          incomeByClient={incomeByClient}
          expenseByCategory={expenseByCategory}
        />
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pl-report_${rangeStart}_to_${rangeEnd}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("P&L report downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Money"
        title="Financial Ledger"
        subtitle="Every dollar in, every dollar out — net profit and trends, live."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => startCreate("expense")} className="border-border/60 bg-secondary/40">
              <ArrowDownRight className="mr-1.5 h-3.5 w-3.5" /> Add expense
            </Button>
            <Button size="sm" onClick={() => startCreate("income")} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add income
            </Button>
          </>
        }
      />

      <Tabs value={view} onValueChange={(v) => setView(v as any)} className="mb-5">
        <TabsList className="bg-secondary/40">
          <TabsTrigger value="dashboard" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Dashboard</TabsTrigger>
          <TabsTrigger value="ledger" className="gap-1.5"><ListOrdered className="h-3.5 w-3.5" /> Ledger</TabsTrigger>
          <TabsTrigger value="forecast" className="gap-1.5"><Compass className="h-3.5 w-3.5" /> Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-5">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No entries yet"
              description="Add your first income or expense to populate the dashboard."
              action={
                <Button onClick={() => startCreate("income")} className="bg-gradient-primary text-primary-foreground shadow-glow">
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add income
                </Button>
              }
            />
          ) : (
            <FinanceDashboard entries={entries} taxRate={settings?.tax_rate ?? 25} />
          )}
        </TabsContent>

        <TabsContent value="forecast" className="mt-5">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ForecastTab entries={entries} projects={projects as any} clients={clients as any} />
          )}
        </TabsContent>

        <TabsContent value="ledger" className="mt-5">
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <GlassCard className="relative overflow-hidden">
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-success/30 to-success/0 blur-2xl" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Income</p>
              <p className="mt-3 font-display text-2xl font-semibold">{fmtCurrencyDetailed(totals.income)}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-success"><TrendingUp className="h-3 w-3" />{startDate || endDate ? "Filtered range" : "All time"}</p>
            </GlassCard>
            <GlassCard className="relative overflow-hidden">
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-destructive/30 to-destructive/0 blur-2xl" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Expenses</p>
              <p className="mt-3 font-display text-2xl font-semibold">{fmtCurrencyDetailed(totals.expense)}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-destructive"><TrendingDown className="h-3 w-3" />{startDate || endDate ? "Filtered range" : "All time"}</p>
            </GlassCard>
            <GlassCard className="relative overflow-hidden">
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-primary/30 to-accent/0 blur-2xl" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Net Profit</p>
              <p className={cn("mt-3 font-display text-2xl font-semibold", totals.net >= 0 ? "gradient-text" : "text-destructive")}>
                {fmtCurrencyDetailed(totals.net)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Income − Expenses</p>
            </GlassCard>
          </div>

          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
            />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportCSV}
                disabled={filtered.length === 0}
                className="h-8 border-border/60 bg-secondary/40 text-xs"
              >
                <FileDown className="mr-1.5 h-3.5 w-3.5" /> Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportPDF}
                disabled={exporting || filtered.length === 0}
                className="h-8 border-border/60 bg-secondary/40 text-xs"
              >
                {exporting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileText className="mr-1.5 h-3.5 w-3.5" />}
                Export PDF Report
              </Button>
            </div>
          </div>

          <div className="mb-3 flex items-center gap-2">
            {(["all", "income", "expense"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs uppercase tracking-wider transition-colors",
                  filter === f ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground",
                )}
              >
                {f}
              </button>
            ))}
            {(startDate || endDate) && (
              <span className="ml-2 text-[11px] text-muted-foreground">
                Showing {filtered.length} of {entries.length} entries
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No entries yet"
              description="Add your first income or expense to start tracking net profit."
              action={
                <Button onClick={() => startCreate("income")} className="bg-gradient-primary text-primary-foreground shadow-glow">
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add income
                </Button>
              }
            />
          ) : (
            <GlassCard className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Kind</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium">Linked</th>
                      <th className="px-4 py-3 text-right font-medium">Amount</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e) => {
                      const auto = isInvoiceAuto(e);
                      return (
                      <tr key={e.id} className="border-b border-border/30 transition-colors hover:bg-secondary/30">
                        <td className="px-4 py-3 text-muted-foreground">{fmtDate(e.occurred_on)}</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                            e.kind === "income" ? "border-success/30 bg-success/15 text-success" : "border-destructive/30 bg-destructive/15 text-destructive",
                          )}>
                            {e.kind === "income" ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                            {e.kind}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            {categoryLabel[e.category]}
                            {auto && (
                              <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-primary">
                                Auto · Invoice
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">{cleanDescription(e.description) || "—"}</td>
                        <td className="px-4 py-3 text-[11px] text-muted-foreground">
                          {e.projects?.name && <div className="truncate max-w-[140px]">{e.projects.name}</div>}
                          {e.clients?.name && <div className="truncate max-w-[140px] opacity-70">{e.clients.name}</div>}
                          {!e.projects && !e.clients && "—"}
                        </td>
                        <td className={cn("px-4 py-3 text-right font-semibold tabular-nums", e.kind === "income" ? "text-success" : "text-destructive")}>
                          {e.kind === "income" ? "+" : "−"}{fmtCurrencyDetailed(Number(e.amount))}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={() => startEdit(e)}
                              disabled={auto}
                              title={auto ? "Auto-generated from invoice — edit the invoice instead" : "Edit"}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => { if (confirm("Delete entry?")) remove.mutate(e.id); }}
                              disabled={auto}
                              title={auto ? "Auto-generated from invoice — un-pay the invoice to remove" : "Delete"}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass border-border/60 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? "Edit entry" : "New entry"}</DialogTitle>
            <DialogDescription>Link to a project or client to roll up revenue automatically.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Kind</Label>
                <Select value={form.kind} onValueChange={(v) => {
                  const k = v as Kind;
                  setForm({ ...form, kind: k, category: k === "income" ? "invoice" : "subscription" });
                }}>
                  <SelectTrigger className="border-border/60 bg-secondary/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as Category })}>
                  <SelectTrigger className="border-border/60 bg-secondary/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {cats.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Amount ($) *</Label>
                <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="border-border/60 bg-secondary/40" />
              </div>
              <div className="grid gap-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.occurred_on} onChange={(e) => setForm({ ...form, occurred_on: e.target.value })} className="border-border/60 bg-secondary/40" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Project</Label>
                <Select value={form.project_id} onValueChange={(v) => {
                  // Auto-fill client from project
                  const proj = projects.find((p) => p.id === v);
                  setForm({ ...form, project_id: v, client_id: proj?.client_id ?? form.client_id });
                }}>
                  <SelectTrigger className="border-border/60 bg-secondary/40"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Client</Label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger className="border-border/60 bg-secondary/40"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border-border/60 bg-secondary/40" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="flex items-center gap-1.5"><Repeat className="h-3 w-3" /> Recurring</Label>
                <Select value={form.recurring} onValueChange={(v) => setForm({ ...form, recurring: v as Recurring })}>
                  <SelectTrigger className="border-border/60 bg-secondary/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">One-time</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.kind === "expense" && (
                <div className="grid gap-1.5">
                  <Label>Tax category</Label>
                  <Select
                    value={form.tax_category}
                    onValueChange={(v) => setForm({ ...form, tax_category: v as TaxCat | "none" })}
                  >
                    <SelectTrigger className="border-border/60 bg-secondary/40"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {taxCategories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {form.kind === "expense" && (
              <div className="flex items-center justify-between rounded-md border border-border/60 bg-secondary/30 px-3 py-2">
                <div>
                  <Label htmlFor="tax-deductible" className="cursor-pointer text-sm">Tax deductible</Label>
                  <p className="text-[11px] text-muted-foreground">Counted in YTD deductible expenses</p>
                </div>
                <Switch
                  id="tax-deductible"
                  checked={form.tax_deductible}
                  onCheckedChange={(checked) => setForm({ ...form, tax_deductible: checked })}
                />
              </div>
            )}

            {form.kind === "income" && (form.client_id !== "none" || form.project_id !== "none") && (
              <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-muted-foreground">
                <span className="text-primary">●</span> Linked income auto-updates the client's total revenue and the project's actual-vs-budget.
              </p>
            )}

            {form.kind === "income" && form.project_id !== "none" && !editing && (() => {
              const amt = Number(form.amount);
              if (!amt) return null;
              const dupe = entries.find(
                (e) =>
                  e.project_id === form.project_id &&
                  e.kind === "income" &&
                  isInvoiceAuto(e) &&
                  Math.abs(Number(e.amount) - amt) < 0.01,
              );
              if (!dupe) return null;
              return (
                <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-[11px] text-warning">
                  ⚠ A paid invoice already created an income entry of {fmtCurrencyDetailed(amt)} for this project.
                  Adding this manually will <strong>double-count</strong> revenue.
                </p>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="border-border/60">Cancel</Button>
            <Button onClick={() => upsert.mutate()} disabled={upsert.isPending} className="bg-gradient-primary text-primary-foreground shadow-glow">
              {upsert.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Finance;
