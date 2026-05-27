"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import {
  addMilestoneAction,
  deleteMilestoneAction,
  toggleMilestoneCompleteAction,
} from "@/features/projects/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ProjectMilestoneRow } from "@/features/projects/queries";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
  projectId: string;
  milestones: ProjectMilestoneRow[];
  canManage: boolean;
}

/**
 * Milestone list + inline-add form.
 *
 * Toggle complete: optimistic update. Delete: confirms inline by hover.
 */
export function MilestonesTab({
  locale,
  projectId,
  milestones,
  canManage,
}: Props) {
  const t = useTranslations("Projects.milestone");
  const format = useFormatter();
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [isPending, startTransition] = useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    startTransition(async () => {
      const result = await addMilestoneAction(
        {
          projectId,
          name: name.trim(),
          description,
          dueAt: dueAt || null,
        },
        locale,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("added"));
      setName("");
      setDescription("");
      setDueAt("");
      setShowForm(false);
      router.refresh();
    });
  }

  function toggle(id: string, complete: boolean) {
    startTransition(async () => {
      const result = await toggleMilestoneCompleteAction(id, locale);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(complete ? t("completed") : t("uncompleted"));
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteMilestoneAction(id, locale);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("removed"));
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {milestones.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[hsl(var(--border-strong))] bg-[hsl(var(--surface-1))] px-4 py-8 text-center text-sm italic text-[hsl(var(--muted-foreground))]/70">
          {t("empty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {milestones.map((m) => {
            const complete = Boolean(m.completedAt);
            const due = m.dueAt ? new Date(m.dueAt) : null;
            return (
              <li
                key={m.id}
                className="group flex items-start gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-3"
              >
                <button
                  type="button"
                  onClick={() => toggle(m.id, !complete)}
                  disabled={!canManage || isPending}
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
                  title={complete ? t("uncomplete") : t("complete")}
                  aria-label={complete ? t("uncomplete") : t("complete")}
                >
                  {complete ? (
                    <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      complete && "text-[hsl(var(--muted-foreground))] line-through",
                    )}
                  >
                    {m.name}
                  </p>
                  {m.description && (
                    <p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                      {m.description}
                    </p>
                  )}
                  {due && (
                    <p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                      {format.dateTime(due, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => remove(m.id)}
                    disabled={isPending}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--destructive))] group-hover:opacity-100 focus-ring"
                    title={t("remove")}
                    aria-label={t("remove")}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canManage &&
        (!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] px-3 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--foreground))] focus-ring"
          >
            <Plus className="h-3 w-3" />
            {t("addTitle")}
          </button>
        ) : (
          <form
            onSubmit={add}
            className="space-y-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-3"
          >
            <p className="text-xs font-semibold">{t("addTitle")}</p>
            <div className="space-y-1.5">
              <Label htmlFor="ms-name">{t("name")}</Label>
              <Input
                id="ms-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                maxLength={160}
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ms-desc">{t("description")}</Label>
              <Textarea
                id="ms-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
                rows={2}
                maxLength={2000}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ms-due">{t("dueAt")}</Label>
              <Input
                id="ms-due"
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setName("");
                  setDescription("");
                  setDueAt("");
                }}
                className="h-9 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] px-3 text-xs hover:bg-[hsl(var(--surface-2))]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || isPending}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-[hsl(var(--primary))] px-3 text-xs font-medium text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-glow)] hover:opacity-90 disabled:opacity-50"
              >
                {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                {t("add")}
              </button>
            </div>
          </form>
        ))}
    </div>
  );
}
