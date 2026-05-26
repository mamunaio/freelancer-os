"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";

import { deleteAccountAction } from "@/features/profile/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsSection } from "./settings-section";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
  email: string;
  /** True when the current user is the Owner — delete is blocked for them. */
  isOwner: boolean;
}

/**
 * Account deletion. Owners are blocked at the UI layer and again on the
 * server. Confirmation requires typing the user's email exactly.
 */
export function DangerZone({ locale, email, isOwner }: Props) {
  const t = useTranslations("Profile.delete");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();

  function onConfirm() {
    if (confirmText.trim().toLowerCase() !== email.toLowerCase()) return;

    startTransition(async () => {
      const result = await deleteAccountAction(confirmText, locale);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("deleted"));
      // Server already cleared the session; bounce to login.
      router.replace(`/${locale}/auth/login`);
      router.refresh();
    });
  }

  return (
    <SettingsSection
      title={t("title")}
      description={t("description")}
    >
      {isOwner && (
        <div className="flex items-start gap-2 rounded-lg border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/8 px-3 py-2.5 text-xs text-[hsl(var(--warning))]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{t("ownerBlock")}</span>
        </div>
      )}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            disabled={isOwner}
            className="flex h-10 items-center rounded-lg border border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))]/10 px-4 text-sm font-medium text-[hsl(var(--destructive))] transition-colors hover:bg-[hsl(var(--destructive))]/20 disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
          >
            {t("button")}
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="dz-confirm">
              {t("confirmInputLabel", { email })}
            </Label>
            <Input
              id="dz-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={email}
              autoComplete="off"
              spellCheck={false}
              className="font-mono text-sm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                onConfirm();
              }}
              disabled={
                isPending ||
                confirmText.trim().toLowerCase() !== email.toLowerCase()
              }
              className="bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:bg-[hsl(var(--destructive))]/90"
            >
              {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {t("confirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}
