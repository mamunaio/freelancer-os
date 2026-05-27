"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  createClientAction,
  updateClientAction,
} from "@/features/clients/actions";
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
import { Textarea } from "@/components/ui/textarea";
import { TagsInput } from "./tags-input";
import type { ClientDetail } from "@/features/clients/queries";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog is in edit mode. */
  client?: ClientDetail | null;
  /** Optional callback after successful create/update. */
  onSaved?: (clientId: string) => void;
}

/**
 * Create + edit dialog. Single component for both flows so the form schema
 * stays in one place.
 */
export function ClientFormDialog({
  locale,
  open,
  onOpenChange,
  client,
  onSaved,
}: Props) {
  const t = useTranslations("Clients.form");
  const tEdit = useTranslations("Clients");
  const router = useRouter();
  const editing = Boolean(client);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // Hydrate form fields when opening in edit mode.
  useEffect(() => {
    if (open) {
      setName(client?.name ?? "");
      setCompany(client?.company ?? "");
      setEmail(client?.email ?? "");
      setPhone(client?.phone ?? "");
      setTags(client?.tags ?? []);
      setNotes(client?.notes ?? "");
      setError(null);
    }
  }, [open, client]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      if (editing && client) {
        const result = await updateClientAction(
          {
            id: client.id,
            name: name.trim(),
            company,
            email,
            phone,
            tags,
            notes,
          },
          locale,
        );
        if (!result.ok) {
          setError(result.error || t("updateFailed"));
          return;
        }
        toast.success(t("updated"));
        onOpenChange(false);
        onSaved?.(client.id);
        router.refresh();
      } else {
        const result = await createClientAction(
          {
            name: name.trim(),
            company,
            email,
            phone,
            tags,
            notes,
          },
          locale,
        );
        if (!result.ok) {
          setError(result.error || t("createFailed"));
          return;
        }
        toast.success(t("created"));
        onOpenChange(false);
        onSaved?.(result.data.id);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {editing ? tEdit("edit") : tEdit("newClient")}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update contact info, tags, or notes."
                : "Create a new client to start tracking projects and revenue."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cl-name">{t("name")}</Label>
              <Input
                id="cl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                maxLength={120}
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cl-company">{t("company")}</Label>
              <Input
                id="cl-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder={t("companyPlaceholder")}
                maxLength={160}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cl-email">{t("email")}</Label>
              <Input
                id="cl-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cl-phone">{t("phone")}</Label>
              <Input
                id="cl-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("phonePlaceholder")}
                maxLength={40}
              />
            </div>
          </div>

          <TagsInput
            value={tags}
            onChange={setTags}
            label={t("tags")}
            hint={t("tagsHint")}
            placeholder={t("tagsPlaceholder")}
          />

          <div className="space-y-1.5">
            <Label htmlFor="cl-notes">{t("notes")}</Label>
            <Textarea
              id="cl-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
              rows={4}
              maxLength={8000}
            />
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
