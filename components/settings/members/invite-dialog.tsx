"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Loader2,
  UserPlus,
} from "lucide-react";

import {
  inviteMemberAction,
  type InvitePayload,
} from "@/features/members/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import type { OrgRole } from "@/lib/db/models/org-member";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
  /** True when the calling user is the Owner — only they can invite Admins. */
  isOwner: boolean;
}

/**
 * Two-step invite dialog: form → success screen with copyable link.
 *
 * Email is optional in the sense that we don't actually send mail in v1 —
 * the link goes onto the clipboard so the inviter can share it however they
 * want. The Resend integration in Phase 12 will swap the success screen for
 * a "we just emailed them" confirmation.
 */
export function InviteDialog({ locale, isOwner }: Props) {
  const t = useTranslations("Members.invite");
  const tHeader = useTranslations("Members");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "ready">("form");
  const [payload, setPayload] = useState<InvitePayload | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("member");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setEmail("");
    setRole("member");
    setPayload(null);
    setError(null);
    setCopied(false);
    setStep("form");
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await inviteMemberAction({ email, role: role as "admin" | "manager" | "member" }, locale);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPayload(result.data);
      setStep("ready");
      router.refresh();
    });
  }

  async function copyLink() {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload.url);
      setCopied(true);
      toast.success(t("copied"));
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("Couldn't copy. Select the link manually.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex h-9 items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-glow)] transition-opacity hover:opacity-90 focus-ring"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>{tHeader("inviteButton")}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {step === "form" ? (
          <form onSubmit={onSubmit} className="space-y-5">
            <DialogHeader>
              <DialogTitle>{t("title")}</DialogTitle>
              <DialogDescription>{t("subtitle")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <Label htmlFor="invite-email">{t("fieldEmail")}</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@studio.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-role">{t("fieldRole")}</Label>
              <Select value={role} onValueChange={(v) => setRole(v as OrgRole)}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isOwner && <SelectItem value="admin">Admin</SelectItem>}
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                <RoleHint role={role} />
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/8 px-3 py-2 text-xs text-[hsl(var(--destructive))]">
                {error}
              </div>
            )}

            <DialogFooter>
              <button
                type="submit"
                disabled={!email.trim() || isPending}
                className="flex h-10 items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-5 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-glow)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isPending ? t("sending") : t("send")}
              </button>
            </DialogFooter>
          </form>
        ) : payload ? (
          <div className="space-y-5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {t("linkReady")}
              </DialogTitle>
              <DialogDescription>
                {t("linkReadyHint", { email: payload.email })}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] p-3">
              <p className="break-all font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                {payload.url}
              </p>
            </div>

            <DialogFooter className="gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-10 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] px-4 text-sm font-medium hover:bg-[hsl(var(--surface-2))]"
              >
                {t("done")}
              </button>
              <button
                type="button"
                onClick={copyLink}
                className="flex h-10 items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-5 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-glow)] hover:opacity-90"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? t("copied") : t("copy")}
              </button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function RoleHint({ role }: { role: OrgRole }) {
  const t = useTranslations("Members.role");
  return <span>{t(`${role}Hint`)}</span>;
}
