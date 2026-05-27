"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import type { Locale } from "@/i18n/routing";
import { TextInput } from "./text-input";
import { PasswordInput } from "./password-input";
import { SubmitButton } from "./submit-button";

interface Props {
  locale: Locale;
}

export function LoginForm({ locale }: Props) {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginFormInner locale={locale} />
    </Suspense>
  );
}

function LoginFormFallback() {
  return (
    <div className="space-y-4">
      <div className="h-10 rounded-lg bg-[hsl(var(--surface-2))]" />
      <div className="h-10 rounded-lg bg-[hsl(var(--surface-2))]" />
      <div className="h-10 rounded-lg bg-[hsl(var(--surface-2))]" />
    </div>
  );
}

function LoginFormInner({ locale }: Props) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const email = String(formData.get("email") ?? "");
      const password = String(formData.get("password") ?? "");

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t("invalidCredentials"));
        return;
      }

      toast.success(t("welcomeBack"));

      // Honor a ?next=... param if it stays inside the same locale.
      const next = searchParams.get("next");
      const safeNext =
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : `/${locale}/dashboard`;
      router.push(safeNext);
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <TextInput
        name="email"
        type="email"
        label={t("email")}
        placeholder="you@studio.com"
        autoComplete="email"
        required
      />
      <PasswordInput
        name="password"
        label={t("password")}
        placeholder="••••••••"
        autoComplete="current-password"
        required
        minLength={1}
      />

      {error && (
        <div className="rounded-lg border border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/8 px-3 py-2 text-xs text-[hsl(var(--destructive))]">
          {error}
        </div>
      )}

      <SubmitButton loading={isPending}>{t("signIn")}</SubmitButton>
    </form>
  );
}
