"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { LeadFormDialog } from "./lead-form-dialog";
import type { Locale } from "@/i18n/routing";

interface MemberOption {
  id: string;
  name: string;
}

interface Props {
  locale: Locale;
  members: MemberOption[];
}

export function NewLeadButton({ locale, members }: Props) {
  const t = useTranslations("Leads");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-glow)] hover:opacity-90 focus-ring"
      >
        <Plus className="h-3.5 w-3.5" />
        {t("newLead")}
      </button>

      <LeadFormDialog
        locale={locale}
        open={open}
        onOpenChange={setOpen}
        members={members}
      />
    </>
  );
}
