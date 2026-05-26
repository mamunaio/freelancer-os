"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { updatePasswordAction } from "@/features/profile/actions";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { SettingsSection } from "./settings-section";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
}

/**
 * Independent password change form. Lives in the same page but doesn't share
 * state with the profile form so partial updates are safe.
 *
 * Hidden if the user signed up via OAuth (no `passwordHash` in DB) — handled
 * by the parent page deciding whether to render this component.
 */
export function PasswordForm({ locale }: Props) {
  const t = useTranslations("Profile");

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (next !== confirm) {
      setError(t("passwordMismatch"));
      return;
    }

    startTransition(async () => {
      const result = await updatePasswordAction(
        {
          currentPassword: current,
          newPassword: next,
          confirmPassword: confirm,
        },
        locale,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(t("passwordSaved"));
      setCurrent("");
      setNext("");
      setConfirm("");
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <SettingsSection
        title={t("section.password")}
        description={t("section.passwordHint")}
      >
        <div className="space-y-1.5">
          <Label htmlFor="pf-current">{t("field.currentPassword")}</Label>
          <PasswordInput
            id="pf-current"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-new">{t("field.newPassword")}</Label>
          <PasswordInput
            id="pf-new"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            hint={t("field.newPasswordHint")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-confirm">{t("field.confirmPassword")}</Label>
          <PasswordInput
            id="pf-confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        {error && (
          <div className="rounded-lg border border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/8 px-3 py-2 text-xs text-[hsl(var(--destructive))]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || !current || !next || !confirm}
          className="flex h-10 items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] px-4 text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--surface-2))] disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t("savePassword")}
        </button>
      </SettingsSection>
    </form>
  );
}
