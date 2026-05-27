"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";

import {
  createProjectAction,
  updateProjectAction,
} from "@/features/projects/actions";
import {
  PROJECT_STATUSES,
  type ProjectMemberRole,
  type ProjectStatus,
} from "@/features/projects/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/money/currency-input";
import { TagsInput } from "@/components/clients/tags-input";
import type { ProjectRow } from "@/features/projects/queries";
import type { Currency } from "@/lib/currency/types";
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ProjectRow | null;
  clients: ClientOption[];
  members: MemberOption[];
  defaultStatus?: ProjectStatus;
  defaultClientId?: string;
}

interface MemberDraft {
  userId: string;
  role: ProjectMemberRole;
}

/**
 * Create + edit dialog. Members can only be edited inline at create time —
 * the detail page exposes a richer member-management surface for existing
 * projects.
 */
export function ProjectFormDialog({
  locale,
  open,
  onOpenChange,
  project,
  clients,
  members,
  defaultStatus,
  defaultClientId,
}: Props) {
  const t = useTranslations("Projects.form");
  const tStatus = useTranslations("Projects.status");
  const tHeader = useTranslations("Projects");
  const router = useRouter();
  const editing = Boolean(project);

  const [name, setName] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [status, setStatus] = useState<ProjectStatus>("planning");
  const [budgetAmount, setBudgetAmount] = useState<number | "">("");
  const [budgetCurrency, setBudgetCurrency] = useState<Currency>("USD");
  const [startedAt, setStartedAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [memberDrafts, setMemberDrafts] = useState<MemberDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setName(project?.name ?? "");
    setClientId(project?.client?.id ?? defaultClientId ?? clients[0]?.id ?? "");
    setDescription(project?.description ?? "");
    setTechStack(project?.techStack ?? []);
    setStatus(project?.status ?? defaultStatus ?? "planning");
    setBudgetAmount(project?.budgetAmount ?? "");
    setBudgetCurrency(project?.budgetCurrency ?? "USD");
    setStartedAt(project?.startedAt ? project.startedAt.slice(0, 10) : "");
    setDueAt(project?.dueAt ? project.dueAt.slice(0, 10) : "");
    setMemberDrafts(
      project?.members?.map((m) => ({
        userId: m.userId,
        role: m.role,
      })) ?? [],
    );
    setError(null);
  }, [open, project, defaultClientId, defaultStatus, clients]);

  const availableMembers = members.filter(
    (m) => !memberDrafts.some((d) => d.userId === m.id),
  );

  function addMemberDraft() {
    if (availableMembers.length === 0) return;
    setMemberDrafts((prev) => [
      ...prev,
      { userId: availableMembers[0].id, role: "contributor" },
    ]);
  }

  function updateMemberDraft(
    index: number,
    patch: Partial<MemberDraft>,
  ) {
    setMemberDrafts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function removeMemberDraft(index: number) {
    setMemberDrafts((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!clientId) {
      setError(t("clientPlaceholder"));
      return;
    }

    const payload = {
      clientId,
      name: name.trim(),
      description,
      techStack,
      status,
      budgetAmount: budgetAmount === "" ? 0 : budgetAmount,
      budgetCurrency,
      startedAt: startedAt || null,
      dueAt: dueAt || null,
    };

    startTransition(async () => {
      if (editing && project) {
        const result = await updateProjectAction(
          { ...payload, id: project.id },
          locale,
        );
        if (!result.ok) {
          setError(result.error || t("updateFailed"));
          return;
        }
        toast.success(t("updated"));
        onOpenChange(false);
        router.refresh();
      } else {
        const result = await createProjectAction(
          { ...payload, members: memberDrafts },
          locale,
        );
        if (!result.ok) {
          setError(result.error || t("createFailed"));
          return;
        }
        toast.success(t("created"));
        onOpenChange(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {editing ? tHeader("edit") : tHeader("newProject")}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update name, scope, budget, or status."
                : "Spin up delivery work for one of your clients."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="pj-name">{t("name")}</Label>
              <Input
                id="pj-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                maxLength={160}
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("client")}</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("clientPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.company ? ` · ${c.company}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("status")}</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as ProjectStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.filter((s) => s !== "archived").map((s) => (
                    <SelectItem key={s} value={s}>
                      {tStatus(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="pj-description">{t("description")}</Label>
              <Textarea
                id="pj-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
                rows={3}
                maxLength={8000}
              />
            </div>
            <div className="sm:col-span-2">
              <TagsInput
                value={techStack}
                onChange={setTechStack}
                label={t("techStack")}
                hint={t("techStackHint")}
                placeholder={t("techStackPlaceholder")}
              />
            </div>
            <CurrencyInput
              amount={budgetAmount}
              onAmountChange={setBudgetAmount}
              currency={budgetCurrency}
              onCurrencyChange={setBudgetCurrency}
              label={t("budget")}
              className="sm:col-span-2"
            />
            <div className="space-y-1.5">
              <Label htmlFor="pj-started">{t("startedAt")}</Label>
              <Input
                id="pj-started"
                type="date"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pj-due">{t("dueAt")}</Label>
              <Input
                id="pj-due"
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
          </div>

          {/* Members editor — create only. Existing projects manage members
              from the detail page. */}
          {!editing && (
            <div className="space-y-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium">{t("members")}</p>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    {t("membersHint")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addMemberDraft}
                  disabled={availableMembers.length === 0}
                  className="inline-flex h-7 items-center gap-1 rounded border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] px-2 text-[11px] font-medium hover:bg-[hsl(var(--surface-2))] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" />
                  {t("addMember")}
                </button>
              </div>

              {memberDrafts.length > 0 && (
                <ul className="space-y-1.5">
                  {memberDrafts.map((draft, index) => {
                    const opts = members.filter(
                      (m) =>
                        m.id === draft.userId ||
                        !memberDrafts.some(
                          (d, i) => i !== index && d.userId === m.id,
                        ),
                    );
                    return (
                      <li
                        key={index}
                        className="flex items-center gap-2 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-2"
                      >
                        <Select
                          value={draft.userId}
                          onValueChange={(v) =>
                            updateMemberDraft(index, { userId: v })
                          }
                        >
                          <SelectTrigger className="h-8 flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {opts.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={draft.role}
                          onValueChange={(v) =>
                            updateMemberDraft(index, {
                              role: v as ProjectMemberRole,
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lead">
                              {t("memberRoleLead")}
                            </SelectItem>
                            <SelectItem value="contributor">
                              {t("memberRoleContributor")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <button
                          type="button"
                          onClick={() => removeMemberDraft(index)}
                          className="flex h-7 w-7 items-center justify-center rounded text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-3))] hover:text-[hsl(var(--destructive))]"
                          aria-label="Remove"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/8 px-3 py-2 text-xs text-[hsl(var(--destructive))]">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="h-10 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] px-4 text-sm font-medium hover:bg-[hsl(var(--surface-2))] disabled:opacity-50"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !clientId || isPending}
              className="flex h-10 items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-5 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-glow)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editing ? t("update") : t("create")}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
