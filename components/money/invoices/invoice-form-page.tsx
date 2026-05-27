"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  createInvoiceAction,
  updateInvoiceDraftAction,
} from "@/features/money/invoices/actions";
import type {
  InvoiceFormInput,
  InvoiceLineItemInput,
} from "@/features/money/schemas";
import type { InvoiceRow } from "@/features/money/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { InvoiceLineItemsEditor } from "./invoice-line-items-editor";
import type { Locale } from "@/i18n/routing";

interface ClientOption {
  id: string;
  name: string;
  company: string | null;
}
interface ProjectOption {
  id: string;
  name: string;
  clientLabel: string | null;
}

interface Props {
  locale: Locale;
  mode: "create" | "edit";
  clients: ClientOption[];
  projects: ProjectOption[];
  defaultCurrency: "USD" | "BDT";
  defaultTaxRate: number;
  invoice?: InvoiceRow;
}

/**
 * Invoice form page (create or edit draft).
 *
 * Standalone page (not a dialog) because line-item editing needs space.
 * Only draft invoices can be edited — sent/viewed/paid/void are immutable.
 */
export function InvoiceFormPage({
  locale,
  mode,
  clients,
  projects,
  defaultCurrency,
  defaultTaxRate,
  invoice,
}: Props) {
  const t = useTranslations("Money.invoices.form");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [clientId, setClientId] = useState(invoice?.clientId ?? "");
  const [projectId, setProjectId] = useState(invoice?.projectId ?? "");
  const [issueDate, setIssueDate] = useState(
    invoice?.issueDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  );
  const [dueDate, setDueDate] = useState(
    invoice?.dueDate.slice(0, 10) ??
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [items, setItems] = useState<InvoiceLineItemInput[]>(
    invoice?.items ?? [{ description: "", quantity: 1, unitPrice: 0 }],
  );
  const [currency, setCurrency] = useState<"USD" | "BDT">(
    invoice?.currency ?? defaultCurrency,
  );
  const [taxRateOverride, setTaxRateOverride] = useState<string>(
    invoice && invoice.taxRateOverride !== null
      ? String(invoice.taxRateOverride)
      : "",
  );
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [terms, setTerms] = useState(invoice?.terms ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!clientId) {
      toast.error(t("client") + " is required");
      return;
    }
    if (items.length === 0) {
      toast.error("Add at least one line item");
      return;
    }

    const input: InvoiceFormInput = {
      clientId,
      projectId: projectId || null,
      issueDate,
      dueDate,
      items,
      currency,
      taxRateOverride: taxRateOverride ? parseFloat(taxRateOverride) : null,
      notes,
      terms,
    };

    startTransition(async () => {
      if (mode === "create") {
        const result = await createInvoiceAction(input, locale);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(t("created"));
        router.push(`/${locale}/money/invoices/${result.data.id}`);
      } else {
        const result = await updateInvoiceDraftAction(invoice!.id, input, locale);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(t("updated"));
        router.push(`/${locale}/money/invoices/${invoice!.id}`);
      }
    });
  }

  // Filter projects by selected client
  const filteredProjects = clientId
    ? projects.filter((p) => {
        const client = clients.find((c) => c.id === clientId);
        return p.clientLabel === (client?.company || client?.name);
      })
    : projects;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">
            {mode === "create" ? t("create") : t("update")}
          </h1>
          {invoice && (
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {invoice.number}
            </p>
          )}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Client */}
            <div>
              <Label htmlFor="client">{t("client")}</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger id="client">
                  <SelectValue placeholder={t("client")} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company || c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project */}
            <div>
              <Label htmlFor="project">{t("project")}</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger id="project">
                  <SelectValue placeholder={t("noProject")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t("noProject")}</SelectItem>
                  {filteredProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Issue date */}
            <div>
              <Label htmlFor="issue-date">{t("issueDate")}</Label>
              <Input
                id="issue-date"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
              />
            </div>

            {/* Due date */}
            <div>
              <Label htmlFor="due-date">{t("dueDate")}</Label>
              <Input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>

            {/* Currency */}
            <div>
              <Label htmlFor="currency">{t("currency")}</Label>
              <Select
                value={currency}
                onValueChange={(v) => setCurrency(v as "USD" | "BDT")}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="BDT">BDT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tax rate override */}
            <div>
              <Label htmlFor="tax-rate">{t("taxRateOverride")}</Label>
              <Input
                id="tax-rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxRateOverride}
                onChange={(e) => setTaxRateOverride(e.target.value)}
                placeholder={`Default: ${defaultTaxRate}%`}
              />
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                {t("taxRateHint")}
              </p>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-6">
          <InvoiceLineItemsEditor
            items={items}
            onChange={setItems}
            currency={currency}
          />
        </div>

        {/* Notes & Terms */}
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="notes">{t("notes")}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("notesPlaceholder")}
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="terms">{t("terms")}</Label>
              <Textarea
                id="terms"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder={t("termsPlaceholder")}
                rows={4}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "create" ? t("create") : t("update")}
          </Button>
        </div>
      </form>
    </div>
  );
}
