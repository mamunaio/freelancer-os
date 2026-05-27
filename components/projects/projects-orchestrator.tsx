"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { KanbanSquare, Plus } from "lucide-react";

import { ProjectsKanban } from "./projects-kanban";
import { ProjectsListView } from "./projects-list-view";
import { ProjectFormDialog } from "./project-form-dialog";
import {
  ProjectsToolbar,
  type ProjectFilterState,
} from "./projects-toolbar";
import { EmptyState } from "@/components/layout/empty-state";
import type { ProjectRow } from "@/features/projects/queries";
import type { ProjectStatus } from "@/features/projects/constants";
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
  initialProjects: ProjectRow[];
  clients: ClientOption[];
  members: MemberOption[];
  canManage: boolean;
}

export function ProjectsOrchestrator({
  locale,
  initialProjects,
  clients,
  members,
  canManage,
}: Props) {
  const t = useTranslations("Projects");

  const [filters, setFilters] = useState<ProjectFilterState>({
    search: "",
    status: "any",
    clientId: "any",
    showArchived: false,
  });
  const deferred = useDeferredValue(filters);

  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectRow | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<ProjectStatus | undefined>();

  const visible = useMemo(
    () => applyFilters(initialProjects, deferred),
    [initialProjects, deferred],
  );

  function openCreate(status?: ProjectStatus) {
    setEditingProject(null);
    setDefaultStatus(status);
    setDialogOpen(true);
  }

  function openEdit(project: ProjectRow) {
    setEditingProject(project);
    setDefaultStatus(undefined);
    setDialogOpen(true);
  }

  const hasAny = initialProjects.length > 0;
  const hasResults = visible.length > 0;

  return (
    <div className="space-y-5">
      {hasAny && (
        <ProjectsToolbar
          filters={filters}
          onFiltersChange={setFilters}
          clients={clients.map(({ id, name }) => ({ id, name }))}
          view={view}
          onViewChange={setView}
        />
      )}

      {!hasAny ? (
        <EmptyState
          icon={KanbanSquare}
          title={t("empty.title")}
          description={t("empty.subtitle")}
          action={
            canManage && clients.length > 0 ? (
              <button
                type="button"
                onClick={() => openCreate()}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-glow)] hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("empty.cta")}
              </button>
            ) : undefined
          }
        />
      ) : !hasResults ? (
        <EmptyState
          icon={KanbanSquare}
          variant="filtered"
          title={t("filtered.title")}
          description={t("filtered.subtitle")}
        />
      ) : view === "kanban" ? (
        <ProjectsKanban
          locale={locale}
          projects={visible}
          onAdd={openCreate}
          onEdit={openEdit}
        />
      ) : (
        <ProjectsListView
          locale={locale}
          projects={visible}
          onEdit={openEdit}
        />
      )}

      {canManage && (
        <ProjectFormDialog
          locale={locale}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          project={editingProject}
          clients={clients}
          members={members}
          defaultStatus={defaultStatus}
        />
      )}
    </div>
  );
}

function applyFilters(
  rows: ProjectRow[],
  filters: ProjectFilterState,
): ProjectRow[] {
  let out = rows;

  if (filters.status !== "any") {
    out = out.filter((p) => p.status === filters.status);
  } else if (!filters.showArchived) {
    out = out.filter((p) => p.status !== "archived");
  }

  if (filters.clientId !== "any") {
    out = out.filter((p) => p.client?.id === filters.clientId);
  }

  if (filters.search.trim()) {
    const needle = filters.search.trim().toLowerCase();
    out = out.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        (p.description ?? "").toLowerCase().includes(needle) ||
        p.techStack.some((t) => t.toLowerCase().includes(needle)) ||
        (p.client?.name ?? "").toLowerCase().includes(needle),
    );
  }

  // Pinned first.
  return [...out].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });
}
