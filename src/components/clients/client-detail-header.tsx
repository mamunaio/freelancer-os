"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Edit, Copy } from "lucide-react";
import { toast } from "sonner";

import { ClientFormDialog } from "./client-form-dialog";
import type { ClientDetail } from "@/features/clients/queries";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
  client: ClientDetail;
}

/**
 * The hero card on the client detail page. Avatar + name + company + actions
 * (edit, copy portal link). Edit dialog state lives here so the rest of the
 * page can stay server-side.
 */
export function ClientDetailHeader({ locale, client }: Props) {
  const t = useTranslations("Clients.actions");
  const [open, setOpen] = useState(false);

  const initials = (client.company ?? client.name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "·";

  function copyPortal() {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/${locale}/portal/${client.portalToken}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success(t("portalLinkCopied")),
      () => toast.error("Couldn't copy"),
    );
  }

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-5">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-base font-semibold text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-glow)]">
            {initials}
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight">
              {client.name}
            </h1>
            <p className="flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))]">
              <Building2 className="h-3 w-3" />
              {client.company ?? "Independent"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={copyPortal}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-3 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] focus-ring"
          >
            <Copy className="h-3 w-3" />
            {t("copyPortalLink")}
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[hsl(var(--primary))] px-3 text-xs font-medium text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-glow)] hover:opacity-90 focus-ring"
          >
            <Edit className="h-3 w-3" />
            {t("edit")}
          </button>
        </div>
      </header>

      <ClientFormDialog
        locale={locale}
        open={open}
        onOpenChange={setOpen}
        client={client}
      />
    </>
  );
}
