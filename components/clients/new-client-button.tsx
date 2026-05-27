"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { ClientFormDialog } from "./client-form-dialog";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
}

/**
 * Header-mounted "New client" button. Owns its own dialog state so the page
 * header can invoke the create flow without coordinating with the list
 * component below.
 */
export function NewClientButton({ locale }: Props) {
  const t = useTranslations("Clients");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-glow)] hover:opacity-90 focus-ring"
      >
        <Plus className="h-3.5 w-3.5" />
        {t("newClient")}
      </button>

      <ClientFormDialog
        locale={locale}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
