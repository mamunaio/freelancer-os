"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { changeProjectStatusAction } from "@/features/projects/actions";
import {
  KANBAN_PROJECT_STATUSES,
  type ProjectStatus,
} from "@/features/projects/constants";
import { ProjectCard } from "./project-card";
import { Money } from "@/components/money/money";
import { cn } from "@/lib/utils";
import type { ProjectRow } from "@/features/projects/queries";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
  projects: ProjectRow[];
  onAdd: (status: ProjectStatus) => void;
  onEdit: (project: ProjectRow) => void;
}

const COLUMN_TINT: Record<ProjectStatus, string> = {
  planning: "border-[hsl(var(--info))]/25 bg-[hsl(var(--info))]/5",
  in_progress: "border-[hsl(var(--primary))]/25 bg-[hsl(var(--primary))]/5",
  review: "border-[hsl(var(--accent))]/25 bg-[hsl(var(--accent))]/5",
  on_hold: "border-[hsl(var(--warning))]/25 bg-[hsl(var(--warning))]/5",
  completed: "border-[hsl(var(--success))]/25 bg-[hsl(var(--success))]/5",
  archived: "border-[hsl(var(--border))] bg-[hsl(var(--surface-1))]/40",
};

export function ProjectsKanban({ locale, projects, onAdd, onEdit }: Props) {
  const tStatus = useTranslations("Projects.status");
  const tKanban = useTranslations("Projects.kanban");
  const router = useRouter();

  const [items, setItems] = useState(projects);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [_isPending, startTransition] = useTransition();

  // Sync with parent updates.
  const lastIncoming = useRef<ProjectRow[]>([]);
  useEffect(() => {
    if (projects !== lastIncoming.current) {
      lastIncoming.current = projects;
      setItems(projects);
    }
  }, [projects]);

  const grouped = useMemo(() => {
    const map: Record<ProjectStatus, ProjectRow[]> = {
      planning: [],
      in_progress: [],
      review: [],
      on_hold: [],
      completed: [],
      archived: [],
    };
    for (const project of items) map[project.status].push(project);
    return map;
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const fromProject = items.find((p) => p.id === activeIdStr);
    if (!fromProject) return;

    let targetStatus: ProjectStatus | null = null;
    if (KANBAN_PROJECT_STATUSES.includes(overIdStr as ProjectStatus)) {
      targetStatus = overIdStr as ProjectStatus;
    } else {
      const overProject = items.find((p) => p.id === overIdStr);
      if (overProject) targetStatus = overProject.status;
    }
    if (!targetStatus || targetStatus === fromProject.status) return;

    setItems((prev) =>
      prev.map((p) =>
        p.id === activeIdStr ? { ...p, status: targetStatus as ProjectStatus } : p,
      ),
    );

    startTransition(async () => {
      const result = await changeProjectStatusAction(
        { id: activeIdStr, status: targetStatus as ProjectStatus },
        locale,
      );
      if (!result.ok) {
        toast.error(result.error);
        router.refresh();
        return;
      }
      router.refresh();
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-2">
        {KANBAN_PROJECT_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            label={tStatus(status)}
            projects={grouped[status]}
            tint={COLUMN_TINT[status]}
            emptyLabel={tKanban("empty")}
            addLabel={tKanban("addCard")}
            onAdd={() => onAdd(status)}
            renderCard={(project) => (
              <DraggableProjectCard
                project={project}
                locale={locale}
                onEdit={() => onEdit(project)}
                isActive={activeId === project.id}
              />
            )}
          />
        ))}
      </div>
    </DndContext>
  );
}

function Column({
  status,
  label,
  projects,
  tint,
  emptyLabel,
  addLabel,
  onAdd,
  renderCard,
}: {
  status: ProjectStatus;
  label: string;
  projects: ProjectRow[];
  tint: string;
  emptyLabel: string;
  addLabel: string;
  onAdd: () => void;
  renderCard: (project: ProjectRow) => React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const total = projects.reduce((sum, p) => sum + p.budgetAmountUsd, 0);

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex w-80 shrink-0 flex-col rounded-xl border p-2 transition-colors",
        tint,
        isOver && "ring-2 ring-[hsl(var(--primary))]/40",
      )}
    >
      <header className="mb-2 flex items-center justify-between px-1.5 py-1">
        <div className="flex items-center gap-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em]">
            {label}
          </h3>
          <span className="rounded bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-[hsl(var(--muted-foreground))]">
            {projects.length}
          </span>
        </div>
        {total > 0 && (
          <span className="text-[10px] font-medium tabular-nums text-[hsl(var(--muted-foreground))]">
            <Money amount={total} currency="USD" compact noTooltip />
          </span>
        )}
      </header>

      <SortableContext
        items={projects.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex min-h-[120px] flex-col gap-2">
          {projects.map((project) => (
            <div key={project.id}>{renderCard(project)}</div>
          ))}
          {projects.length === 0 && (
            <p className="px-1.5 py-3 text-center text-[11px] italic text-[hsl(var(--muted-foreground))]/60">
              {emptyLabel}
            </p>
          )}
        </div>
      </SortableContext>

      {status !== "archived" && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-2 flex h-8 items-center justify-center gap-1 rounded-md text-[11px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--foreground))] focus-ring"
        >
          <Plus className="h-3 w-3" />
          {addLabel}
        </button>
      )}
    </section>
  );
}

function DraggableProjectCard({
  project,
  locale,
  onEdit,
  isActive,
}: {
  project: ProjectRow;
  locale: Locale;
  onEdit: () => void;
  isActive: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isActive && isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ProjectCard
        project={project}
        locale={locale}
        onEdit={onEdit}
        variant="kanban"
        dragHandleProps={{
          attributes: attributes as unknown as Record<string, unknown>,
          listeners: (listeners ?? undefined) as unknown as
            | Record<string, unknown>
            | undefined,
          isDragging,
        }}
      />
    </div>
  );
}
