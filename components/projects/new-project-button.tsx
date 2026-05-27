"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { ProjectFormDialog } from "./project-form-dialog";
import type { Locale } from "@/i18n/routing";

interface ClientOption {
  id: string;
  name: string;
  company: string | null;
}
interface MemberOption {
  id: string;
  name: string;
}

interface Props {
  locale: Locale;
  clients: ClientOption[];
  members: MemberOption[];
  defaultOpen?: boolean;
}

export function NewProjectButton({ locale, clients, members, defaultOpen = false }: Props) {
  const t = useTranslations("Projects");
  const [open, setOpen] = useState(defaultOpen);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={clients.length === 0}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-glow)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
        title={
          clients.length === 0 ? "Create a client first" : undefined
        }
      >
        <Plus className="h-3.5 w-3.5" />
        {t("newProject")}
      </button>

      <ProjectFormDialog
        locale={locale}
        open={open}
        onOpenChange={setOpen}
        clients={clients}
        members={members}
      />
    </>
  );
}
