"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "sonner";

import { createWorkspaceAction } from "@/features/auth/onboarding-action";
import { TextInput } from "./text-input";
import { SubmitButton } from "./submit-button";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
  defaultName: string;
}

export function OnboardingForm({ locale, defaultName }: Props) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createWorkspaceAction({
        organizationName: name,
        locale,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Workspace ready");
      router.push(`/${locale}/dashboard`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <TextInput
        name="organizationName"
        label="Workspace name"
        placeholder="Acme Studio"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        required
        minLength={2}
      />

      {error && (
        <div className="rounded-lg border border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/8 px-3 py-2 text-xs text-[hsl(var(--destructive))]">
          {error}
        </div>
      )}

      <SubmitButton loading={isPending}>Create workspace</SubmitButton>

      <button
        type="button"
        onClick={() =>
          signOut({ callbackUrl: `/${locale}/auth/login` })
        }
        className="block w-full text-center text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
      >
        Sign out and use a different account
      </button>
    </form>
  );
}
