"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  createTaskAction,
  updateTaskAction,
} from "@/features/tasks/actions";
import {
  ENERGY_LEVELS,
  ESTIMATE_PRESETS,
  TASK_PRIORITIES,
  TASK_QUADRANTS,
  WORK_TYPES,
  type EnergyLevel,
  type TaskPriority,
  type TaskQuadrant,
  type WorkType,
} from "@/features/tasks/constants";
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
import { TagsInput } from "@/components/clients/tags-input";
import { cn } from "@/lib/utils";
import type { TaskRow } from "@/features/tasks/queries";
import type { Locale } from "@/i18n/routing";

interface ProjectOption {
  id: string;
  name: string;
  clientLabel: string | null;
}
interface MemberOption {
  id: string;
  name: string;
}

interface Props {
  locale: Locale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: TaskRow | null;
  defaultQuadrant?: TaskQuadrant;
  defaultProjectId?: string;
  projects: ProjectOption[];
  members: MemberOption[];
}

const NO_PROJECT = "__none";
const UNASSIGNED = "__unassigned";

export function TaskFormDialog({
  locale,
  open,
  onOpenChange,
  task,
  defaultQuadrant,
  defaultProjectId,
  projects,
  members,
}: Props) {
  const t = useTranslations("Tasks.form");
  const tQuadrant = useTranslations("Tasks.quadrant");
  const tPriority = useTranslations("Tasks.priority");
  const tWork = useTranslations("Tasks.workType");
  const tEnergy = useTranslations("Tasks.energy");
  const tHeader = useTranslations("Tasks");
  const router = useRouter();
  const editing = Boolean(task);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string>(NO_PROJECT);
  const [assigneeId, setAssigneeId] = useState<string>(UNASSIGNED);
  const [quadrant, setQuadrant] = useState<TaskQuadrant>("q2");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [workType, setWorkType] = useState<WorkType | "none">("none");
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | "none">("none");
  const [estimateMinutes, setEstimateMinutes] = useState<number | "">("");
  const [tags, setTags] = useState<string[]>([]);
  const [dueAt, setDueAt] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setProjectId(task?.project?.id ?? defaultProjectId ?? NO_PROJECT);
    setAssigneeId(task?.assignee?.id ?? UNASSIGNED);
    setQuadrant(task?.quadrant ?? defaultQuadrant ?? "q2");
    setPriority(task?.priority ?? "medium");
    setWorkType((task?.workType ?? "none") as WorkType | "none");
    setEnergyLevel((task?.energyLevel ?? "none") as EnergyLevel | "none");
    setEstimateMinutes(task?.estimateMinutes ?? "");
    setTags(task?.tags ?? []);
    setDueAt(task?.dueAt ? task.dueAt.slice(0, 10) : "");
    setError(null);
  }, [open, task, defaultQuadrant, defaultProjectId]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      title: title.trim(),
      description,
      projectId: projectId === NO_PROJECT ? null : projectId,
      assigneeId: assigneeId === UNASSIGNED ? null : assigneeId,
      quadrant,
      priority,
      workType: workType === "none" ? null : workType,
      energyLevel: energyLevel === "none" ? null : energyLevel,
      estimateMinutes: estimateMinutes === "" ? null : Number(estimateMinutes),
      tags,
      dueAt: dueAt || null,
    };

    startTransition(async () => {
      if (editing && task) {
        const result = await updateTaskAction(
          { ...payload, id: task.id },
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
        const result = await createTaskAction(payload, locale);
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
              {editing ? tHeader("edit") : tHeader("newTask")}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Adjust the title, scope, or scheduling."
                : "Capture a thread of work in the right quadrant."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="tk-title">{t("title")}</Label>
            <Input
              id="tk-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
              maxLength={240}
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tk-desc">{t("description")}</Label>
            <Textarea
              id="tk-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              rows={3}
              maxLength={8000}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("project")}</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROJECT}>{t("noProject")}</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.clientLabel ? ` · ${p.clientLabel}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("assignee")}</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>{t("noAssignee")}</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quadrant picker — visual 2x2 */}
          <div className="space-y-1.5">
            <Label>{t("quadrant")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {TASK_QUADRANTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuadrant(q)}
                  aria-pressed={quadrant === q}
                  className={cn(
                    "flex flex-col items-start rounded-lg border p-2.5 text-left transition-colors focus-ring",
                    quadrant === q
                      ? "border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary))]/8"
                      : "border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] hover:bg-[hsl(var(--surface-2))]",
                  )}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
                    {q.toUpperCase()}
                  </span>
                  <span className="mt-0.5 text-[12px] font-medium">
                    {tQuadrant(`${q}Short` as `q1Short`)}
                  </span>
                  <span className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                    {tQuadrant(q)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>{t("priority")}</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as TaskPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {tPriority(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("workType")}</Label>
              <Select
                value={workType}
                onValueChange={(v) => setWorkType(v as WorkType | "none")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {WORK_TYPES.map((w) => (
                    <SelectItem key={w} value={w}>
                      {tWork(w)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("energy")}</Label>
              <Select
                value={energyLevel}
                onValueChange={(v) => setEnergyLevel(v as EnergyLevel | "none")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {ENERGY_LEVELS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {tEnergy(e)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("estimate")}</Label>
              <div className="flex flex-wrap items-center gap-1.5">
                {ESTIMATE_PRESETS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setEstimateMinutes(m)}
                    aria-pressed={estimateMinutes === m}
                    className={cn(
                      "h-7 rounded border px-2 text-[11px] font-medium transition-colors",
                      estimateMinutes === m
                        ? "border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
                        : "border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                    )}
                  >
                    {m}m
                  </button>
                ))}
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={5}
                  value={estimateMinutes}
                  onChange={(e) =>
                    setEstimateMinutes(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  placeholder={t("estimateMinutes")}
                  className="h-7 w-24 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tk-due">{t("dueAt")}</Label>
              <Input
                id="tk-due"
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
          </div>

          <TagsInput
            value={tags}
            onChange={setTags}
            label={t("tags")}
            hint={t("tagsHint")}
            placeholder={t("tagsPlaceholder")}
          />

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
              disabled={!title.trim() || isPending}
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
