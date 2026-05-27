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
  /** Pre-filled fields when arriving from an invitation link. */
  invite?: {
    token: string;
    email: string;
  };
}

export function SignupForm({ locale, invite }: Props) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const formEmail = String(formData.get("email") ?? "");
      const formPassword = String(formData.get("password") ?? "");
      const formName = String(formData.get("name") ?? "");
      const formOrg = String(formData.get("organizationName") ?? "");

      // When joining via an invitation, we don't create a new org — the user
      // becomes a member of the inviting org instead. We still need *some*
      // value for organizationName because the action accepts both flows
      // through the same schema; we feed a placeholder that the server-side
      // invitation flow ignores.
      const isInviteFlow = Boolean(invite);

      const result = await signupAction({
        name: formName,
        email: isInviteFlow ? invite!.email : formEmail,
        password: formPassword,
        organizationName: isInviteFlow ? "_invited_" : formOrg,
        locale,
        // Pass the invite token so the action knows to skip org creation.
        inviteToken: invite?.token,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      // Auto sign in.
      const signInResult = await signIn("credentials", {
        email: isInviteFlow ? invite!.email : formEmail,
        password: formPassword,
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
      {!invite && (
        <TextInput
          name="organizationName"
          label={t("organization")}
          placeholder="Acme Studio"
          autoComplete="organization"
          required
          minLength={2}
        />
      )}
      <TextInput
        name="email"
        type="email"
        label={t("email")}
        placeholder="you@studio.com"
        autoComplete="email"
        defaultValue={invite?.email}
        readOnly={Boolean(invite)}
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
