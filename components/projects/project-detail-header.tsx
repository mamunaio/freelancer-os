"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Edit, Pin, PinOff, Briefcase } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ProjectFormDialog } from "./project-form-dialog";
import { togglePinProjectAction } from "@/features/projects/actions";
import { ProjectStatusBadge } from "./status-badge";
import type { ProjectRow } from "@/features/projects/queries";
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
  project: ProjectRow;
  clients: ClientOption[];
  members: MemberOption[];
  canManage: boolean;
}

export function ProjectDetailHeader({
  locale,
  project,
  clients,
  members,
  canManage,
}: Props) {
  const t = useTranslations("Projects.actions");
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function pin() {
    const result = await togglePinProjectAction(project.id, locale);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(project.pinned ? t("unpinned") : t("pinned"));
    router.refresh();
  }

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-5">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-glow)]">
            <Briefcase className="h-5 w-5" />
          </span>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {project.name}
              </h1>
              <ProjectStatusBadge status={project.status} size="xs" />
              {project.pinned && (
                <span className="inline-flex items-center gap-1 rounded border border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[hsl(var(--primary))]">
                  <Pin className="h-2.5 w-2.5" />
                  Pinned
                </span>
              )}
            </div>
            {project.client && (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {project.client.company ?? project.client.name}
              </p>
            )}
          </div>
        </div>

        {canManage && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={pin}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-3 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] focus-ring"
            >
              {project.pinned ? (
                <>
                  <PinOff className="h-3 w-3" />
                  {t("unpin")}
                </>
              ) : (
                <>
                  <Pin className="h-3 w-3" />
                  {t("pin")}
                </>
              )}
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
        )}
      </header>

      {canManage && (
        <ProjectFormDialog
          locale={locale}
          open={open}
          onOpenChange={setOpen}
          project={project}
          clients={clients}
          members={members}
        />
      )}
    </>
  );
}
