"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, ListChecks, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  bulkDeleteTasksAction,
  bulkMarkDoneAction,
} from "@/features/tasks/actions";
import { TaskFormDialog } from "./task-form-dialog";
import { TasksMatrix } from "./tasks-matrix";
import { TasksListView } from "./tasks-list-view";
import {
  TasksToolbar,
  type TaskFilterState,
} from "./tasks-toolbar";
import { EmptyState } from "@/components/layout/empty-state";
import type { TaskQuadrant } from "@/features/tasks/constants";
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
  initialTasks: TaskRow[];
  projects: ProjectOption[];
  members: MemberOption[];
}

export function TasksOrchestrator({
  locale,
  initialTasks,
  projects,
  members,
}: Props) {
  const t = useTranslations("Tasks");
  const tActions = useTranslations("Tasks.actions");
  const router = useRouter();

  const [filters, setFilters] = useState<TaskFilterState>({
    search: "",
    projectId: "any",
    assigneeId: "any",
    priority: "any",
    showDone: false,
  });
  const deferred = useDeferredValue(filters);

  const [view, setView] = useState<"matrix" | "list">("matrix");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [defaultQuadrant, setDefaultQuadrant] = useState<TaskQuadrant | undefined>();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const visible = useMemo(
    () => applyFilters(initialTasks, deferred),
    [initialTasks, deferred],
  );

  function openCreate(quadrant?: TaskQuadrant) {
    setEditingTask(null);
    setDefaultQuadrant(quadrant);
    setDialogOpen(true);
  }

  function openEdit(task: TaskRow) {
    setEditingTask(task);
    setDefaultQuadrant(undefined);
    setDialogOpen(true);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function bulkDone(done: boolean) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    startTransition(async () => {
      const result = await bulkMarkDoneAction({ ids, done }, locale);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        done ? tActions("completed") : tActions("uncompleted"),
      );
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  function bulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    startTransition(async () => {
      const result = await bulkDeleteTasksAction(ids, locale);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(tActions("deleted"));
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  const hasAny = initialTasks.length > 0;
  const hasResults = visible.length > 0;

  return (
    <div className="space-y-4">
      {hasAny && (
        <TasksToolbar
          filters={filters}
          onFiltersChange={setFilters}
          projects={projects.map(({ id, name }) => ({ id, name }))}
          members={members}
          view={view}
          onViewChange={setView}
        />
      )}

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/10 px-3 py-2 text-xs">
          <span className="font-medium text-[hsl(var(--primary))]">
            {tActions("selected", { count: selectedIds.size })}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => bulkDone(true)}
              disabled={isPending}
              className="flex h-7 items-center gap-1 rounded border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] px-2 text-[11px] font-medium hover:bg-[hsl(var(--surface-2))] disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              {tActions("bulkMarkDone")}
            </button>
            <button
              type="button"
              onClick={bulkDelete}
              disabled={isPending}
              className="flex h-7 items-center gap-1 rounded border border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/10 px-2 text-[11px] font-medium text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/15 disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              {tActions("bulkDelete")}
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-[11px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
              {tActions("cancel")}
            </button>
          </div>
        </div>
      )}

      {!hasAny ? (
        <EmptyState
          icon={ListChecks}
          title={t("empty.title")}
          description={t("empty.subtitle")}
          action={
            <button
              type="button"
              onClick={() => openCreate()}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-glow)] hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("empty.cta")}
            </button>
          }
        />
      ) : !hasResults ? (
        <EmptyState
          icon={ListChecks}
          variant="filtered"
          title={t("filtered.title")}
          description={t("filtered.subtitle")}
        />
      ) : view === "matrix" ? (
        <TasksMatrix
          locale={locale}
          tasks={visible}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onAdd={openCreate}
          onEdit={openEdit}
        />
      ) : (
        <TasksListView
          locale={locale}
          tasks={visible}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onEdit={openEdit}
        />
      )}

      <TaskFormDialog
        locale={locale}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editingTask}
        defaultQuadrant={defaultQuadrant}
        projects={projects}
        members={members}
      />
    </div>
  );
}

function applyFilters(
  rows: TaskRow[],
  filters: TaskFilterState,
): TaskRow[] {
  let out = rows;

  if (!filters.showDone) {
    out = out.filter((t) => !t.done);
  }

  if (filters.priority !== "any") {
    out = out.filter((t) => t.priority === filters.priority);
  }

  if (filters.projectId === "none") {
    out = out.filter((t) => !t.project);
  } else if (filters.projectId !== "any") {
    out = out.filter((t) => t.project?.id === filters.projectId);
  }

  if (filters.assigneeId === "unassigned") {
    out = out.filter((t) => !t.assignee);
  } else if (filters.assigneeId !== "any" && filters.assigneeId !== "me") {
    out = out.filter((t) => t.assignee?.id === filters.assigneeId);
  }

  if (filters.search.trim()) {
    const needle = filters.search.trim().toLowerCase();
    out = out.filter(
      (t) =>
        t.title.toLowerCase().includes(needle) ||
        (t.description ?? "").toLowerCase().includes(needle) ||
        t.tags.some((tag) => tag.toLowerCase().includes(needle)),
    );
  }

  return out;
}
