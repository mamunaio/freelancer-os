"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { signupAction } from "@/features/auth/actions";
import type { Locale } from "@/i18n/routing";
import { TextInput } from "./text-input";
import { PasswordInput } from "./password-input";
import { SubmitButton } from "./submit-button";

interface Props {
  locale: Locale;
}

export function SignupForm({ locale }: Props) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await signupAction({
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        organizationName: String(formData.get("organizationName") ?? ""),
        locale,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      // Auto sign in after successful signup.
      const signInResult = await signIn("credentials", {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        redirect: false,
      });

      if (signInResult?.error) {
        toast.error("Account created, but sign-in failed. Please log in.");
        router.push("/auth/login");
        return;
      }

      toast.success("Welcome to Injaazh OS");
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <TextInput
        name="name"
        label={t("name")}
        placeholder="Mamun Ahmed"
        autoComplete="name"
        required
        minLength={2}
      />
      <TextInput
        name="organizationName"
        label={t("organization")}
        placeholder="Acme Studio"
        autoComplete="organization"
        required
        minLength={2}
      />
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
        autoComplete="new-password"
        required
        minLength={8}
        hint={t("passwordHint")}
      />

      {error && (
        <div className="rounded-lg border border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/8 px-3 py-2 text-xs text-[hsl(var(--destructive))]">
          {error}
        </div>
      )}

      <SubmitButton loading={isPending}>{t("createAccount")}</SubmitButton>
    </form>
  );
}
