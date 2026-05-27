"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  createFinanceEntryAction,
  updateFinanceEntryAction,
} from "@/features/money/ledger/actions";
import {
  FINANCE_KINDS,
  FINANCE_RECURRING_CADENCES,
  type FinanceKind,
  type FinanceRecurringCadence,
} from "@/features/money/schemas";
import type { FinanceEntryRow } from "@/features/money/types";
import { CurrencyInput } from "@/components/money/currency-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { Currency } from "@/lib/currency/types";
import { cn } from "@/lib/utils";
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the dialog is in edit mode. */
  entry?: FinanceEntryRow | null;
  /** Pre-existing categories for autocomplete suggestions. */
  categories: string[];
  clients: ClientOption[];
  projects: ProjectOption[];
}

const NO_CLIENT = "__none";
const NO_PROJECT = "__none";

/**
 * Create + edit dialog for a single ledger entry.
 *
 * The schema's amount + currency are owned by `<CurrencyInput>`. Server
 * recomputes the USD snapshot on submit, so we never trust whatever USD
 * the client thinks the entry should cost.
 *
 * Edits on `source === "invoice"` rows are pre-blocked at the table layer
 * (no Edit option), but the action still re-checks server-side.
 */
export function LedgerFormDialog({
  locale,
  open,
  onOpenChange,
  entry,
  categories,
  clients,
  projects,
}: Props) {
  const t = useTranslations("Money.ledger.form");
  const tHeader = useTranslations("Money.ledger");
  const router = useRouter();
  // An entry with an empty id is a "log again" seed — still create, just
  // with the user's prior recurring values pre-filled.
  const editing = Boolean(entry?.id);

  const [kind, setKind] = useState<FinanceKind>("expense");
  const [category, setCategory] = useState("");
  const [occurredOn, setOccurredOn] = useState(today());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [clientId, setClientId] = useState<string>(NO_CLIENT);
  const [projectId, setProjectId] = useState<string>(NO_PROJECT);
  const [taxDeductible, setTaxDeductible] = useState(false);
  const [taxCategory, setTaxCategory] = useState("");
  const [recurringCadence, setRecurringCadence] =
    useState<FinanceRecurringCadence>("none");
  const [receiptUrl, setReceiptUrl] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Hydrate when opening — covers both create defaults and edit values.
  useEffect(() => {
    if (!open) return;
    setKind((entry?.kind as FinanceKind) ?? "expense");
    setCategory(entry?.category ?? "");
    setOccurredOn(entry?.occurredOn ? entry.occurredOn.slice(0, 10) : today());
    setDescription(entry?.description ?? "");
    setAmount(entry?.amount ?? "");
    setCurrency((entry?.currency as Currency) ?? "USD");
    setClientId(entry?.clientId ?? NO_CLIENT);
    setProjectId(entry?.projectId ?? NO_PROJECT);
    setTaxDeductible(Boolean(entry?.taxDeductible));
    setTaxCategory(entry?.taxCategory ?? "");
    setRecurringCadence(
      (entry?.recurring?.cadence as FinanceRecurringCadence) ?? "none",
    );
    setReceiptUrl(entry?.receiptUrl ?? "");
    setError(null);
  }, [open, entry]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (amount === "" || !Number.isFinite(amount)) {
      setError(t("amount"));
      return;
    }

    const payload = {
      kind,
      category: category.trim(),
      occurredOn,
      description,
      amount: Number(amount),
      currency,
      taxDeductible,
      taxCategory,
      recurringCadence,
      nextReminderAt: null,
      receiptUrl,
      clientId: clientId === NO_CLIENT ? null : clientId,
      projectId: projectId === NO_PROJECT ? null : projectId,
    };

    startTransition(async () => {
      if (editing && entry) {
        const result = await updateFinanceEntryAction(
          entry.id,
          payload,
          locale,
        );
        if (!result.ok) {
          setError(result.error || t("saveFailed"));
          return;
        }
        toast.success(t("updated"));
        onOpenChange(false);
        router.refresh();
      } else {
        const result = await createFinanceEntryAction(payload, locale);
        if (!result.ok) {
          setError(result.error || t("saveFailed"));
          return;
        }
        toast.success(t("created"));
        onOpenChange(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {editing ? tHeader("actions.edit") : t("title")}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update this entry. Synced totals refresh immediately."
                : "Log income or an expense — totals across the module update right away."}
            </DialogDescription>
          </DialogHeader>

          {/* Kind toggle */}
          <div className="space-y-1.5">
            <Label>{t("kind")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {FINANCE_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  aria-pressed={kind === k}
                  className={cn(
                    "h-10 rounded-lg border text-sm font-medium transition-colors focus-ring",
                    kind === k
                      ? k === "income"
                        ? "border-[hsl(var(--success))]/50 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]"
                        : "border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary))]/8 text-[hsl(var(--primary))]"
                      : "border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                  )}
                >
                  {k === "income" ? t("kindIncome") : t("kindExpense")}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="le-category">{t("category")}</Label>
              <Input
                id="le-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={t("categoryPlaceholder")}
                list="le-category-suggestions"
                maxLength={80}
                required
                autoFocus
              />
              {categories.length > 0 && (
                <datalist id="le-category-suggestions">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="le-date">{t("occurredOn")}</Label>
              <Input
                id="le-date"
                type="date"
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
                required
              />
            </div>
          </div>

          <CurrencyInput
            amount={amount}
            onAmountChange={setAmount}
            currency={currency}
            onCurrencyChange={setCurrency}
            label={t("amount")}
            required
          />

          <div className="space-y-1.5">
            <Label htmlFor="le-desc">{t("description")}</Label>
            <Textarea
              id="le-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              rows={2}
              maxLength={2000}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("client")}</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CLIENT}>{t("noClient")}</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company || c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("project")}</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROJECT}>{t("noProject")}</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.clientLabel ? ` · ${p.clientLabel}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tax + recurring on the same row to keep the dialog compact */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={taxDeductible}
                  onChange={(e) => setTaxDeductible(e.target.checked)}
                  className="h-4 w-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--ring))]/30"
                />
                {t("tax")}
              </Label>
              <Input
                value={taxCategory}
                onChange={(e) => setTaxCategory(e.target.value)}
                placeholder={t("taxCategoryPlaceholder")}
                maxLength={60}
                disabled={!taxDeductible}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("recurring")}</Label>
              <Select
                value={recurringCadence}
                onValueChange={(v) =>
                  setRecurringCadence(v as FinanceRecurringCadence)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINANCE_RECURRING_CADENCES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c === "none"
                        ? t("recurringNone")
                        : c === "monthly"
                          ? t("recurringMonthly")
                          : t("recurringYearly")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="le-receipt">{t("receipt")}</Label>
            <Input
              id="le-receipt"
              type="url"
              value={receiptUrl}
              onChange={(e) => setReceiptUrl(e.target.value)}
              placeholder="https://…"
            />
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
              {t("receiptHint")}
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/8 px-3 py-2 text-xs text-[hsl(var(--destructive))]">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="h-10 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] px-4 text-sm font-medium hover:bg-[hsl(var(--surface-2))] disabled:opacity-50"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={
                isPending || !category.trim() || amount === "" || !occurredOn
              }
              className="flex h-10 items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-5 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-glow)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editing ? t("update") : t("create")}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
