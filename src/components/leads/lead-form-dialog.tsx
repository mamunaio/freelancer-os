"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  createLeadAction,
  updateLeadAction,
} from "@/features/leads/actions";
import {
  LEAD_SOURCES,
  LEAD_STAGES,
  type LeadSource,
  type LeadStage,
} from "@/features/leads/constants";
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
import { CurrencyInput } from "@/components/money/currency-input";
import type { LeadRow } from "@/features/leads/queries";
import type { Currency } from "@/lib/currency/types";
import type { Locale } from "@/i18n/routing";

interface MemberOption {
  id: string;
  name: string;
}

interface Props {
  locale: Locale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog edits this lead. */
  lead?: LeadRow | null;
  /** Pre-pick a stage when creating from a kanban column header. */
  defaultStage?: LeadStage;
  /** Org members shown in the owner picker. */
  members: MemberOption[];
}

const UNASSIGNED = "__unassigned" as const;

/**
 * Single dialog used for both create + edit.
 */
export function LeadFormDialog({
  locale,
  open,
  onOpenChange,
  lead,
  defaultStage,
  members,
}: Props) {
  const t = useTranslations("Leads.form");
  const tStage = useTranslations("Leads.stage");
  const tSource = useTranslations("Leads.source");
  const tHeader = useTranslations("Leads");
  const router = useRouter();
  const editing = Boolean(lead);

  // Form fields
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<LeadStage>("new");
  const [source, setSource] = useState<LeadSource>("other");
  const [amount, setAmount] = useState<number | "">("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [ownerId, setOwnerId] = useState<string>(UNASSIGNED);
  const [nextActionAt, setNextActionAt] = useState("");
  const [nextActionNote, setNextActionNote] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // Hydrate when opening.
  useEffect(() => {
    if (!open) return;
    setName(lead?.name ?? "");
    setCompany(lead?.company ?? "");
    setEmail(lead?.email ?? "");
    setPhone(lead?.phone ?? "");
    setStage(lead?.stage ?? defaultStage ?? "new");
    setSource(lead?.source ?? "other");
    setAmount(lead?.estimatedAmount ?? "");
    setCurrency(lead?.estimatedCurrency ?? "USD");
    setOwnerId(lead?.owner?.id ?? UNASSIGNED);
    setNextActionAt(
      lead?.nextActionAt ? lead.nextActionAt.slice(0, 10) : "",
    );
    setNextActionNote(lead?.nextActionNote ?? "");
    setNotes(lead?.notes ?? "");
    setError(null);
  }, [open, lead, defaultStage]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      name: name.trim(),
      company,
      email,
      phone,
      stage,
      source,
      estimatedAmount: amount === "" ? 0 : amount,
      estimatedCurrency: currency,
      ownerId: ownerId === UNASSIGNED ? null : ownerId,
      nextActionAt: nextActionAt || null,
      nextActionNote,
      notes,
    };

    startTransition(async () => {
      if (editing && lead) {
        const result = await updateLeadAction(
          { ...payload, id: lead.id },
          locale,
        );
        if (!result.ok) {
          setError(result.error || t("updateFailed"));
          return;
        }
        toast.success(t("updated"));
        onOpenChange(false);
        router.refresh();
      } else {
        const result = await createLeadAction(payload, locale);
        if (!result.ok) {
          setError(result.error || t("createFailed"));
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
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {editing ? tHeader("edit") : tHeader("newLead")}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the contact, value, or stage."
                : "Add a new opportunity to your pipeline."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ld-name">{t("name")}</Label>
              <Input
                id="ld-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                maxLength={120}
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ld-company">{t("company")}</Label>
              <Input
                id="ld-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder={t("companyPlaceholder")}
                maxLength={160}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ld-email">{t("email")}</Label>
              <Input
                id="ld-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ld-phone">{t("phone")}</Label>
              <Input
                id="ld-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("phonePlaceholder")}
                maxLength={40}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("stage")}</Label>
              <Select
                value={stage}
                onValueChange={(v) => setStage(v as LeadStage)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {tStage(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("source")}</Label>
              <Select
                value={source}
                onValueChange={(v) => setSource(v as LeadSource)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {tSource(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CurrencyInput
              amount={amount}
              onAmountChange={setAmount}
              currency={currency}
              onCurrencyChange={setCurrency}
              label={t("estimatedValue")}
              className="sm:col-span-2"
            />
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t("owner")}</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>{t("noOwner")}</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ld-next-date">{t("nextActionAt")}</Label>
              <Input
                id="ld-next-date"
                type="date"
                value={nextActionAt}
                onChange={(e) => setNextActionAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ld-next-note">{t("nextActionNote")}</Label>
              <Input
                id="ld-next-note"
                value={nextActionNote}
                onChange={(e) => setNextActionNote(e.target.value)}
                placeholder={t("nextActionPlaceholder")}
                maxLength={500}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ld-notes">{t("notes")}</Label>
              <Textarea
                id="ld-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("notesPlaceholder")}
                rows={3}
                maxLength={8000}
              />
            </div>
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
              disabled={!name.trim() || isPending}
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
