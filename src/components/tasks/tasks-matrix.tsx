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

import { moveTaskQuadrantAction } from "@/features/tasks/actions";
import {
  QUADRANT_ORDER,
  type TaskQuadrant,
} from "@/features/tasks/constants";
import { TaskCard } from "./task-card";
import { cn } from "@/lib/utils";
import type { TaskRow } from "@/features/tasks/queries";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
  tasks: TaskRow[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onAdd: (quadrant: TaskQuadrant) => void;
  onEdit: (task: TaskRow) => void;
}

const QUADRANT_TINT: Record<TaskQuadrant, string> = {
  q1: "border-[hsl(var(--destructive))]/25 bg-[hsl(var(--destructive))]/5",
  q2: "border-[hsl(var(--primary))]/25 bg-[hsl(var(--primary))]/5",
  q3: "border-[hsl(var(--warning))]/25 bg-[hsl(var(--warning))]/5",
  q4: "border-[hsl(var(--border))] bg-[hsl(var(--surface-1))]/40",
};

/**
 * 2×2 Eisenhower matrix with drag-and-drop between quadrants.
 *
 * Done tasks are stripped from the matrix view (they live in the list view
 * with the "Show done" filter). Each quadrant cell scrolls independently so
 * one giant column doesn't drag the whole page down.
 */
export function TasksMatrix({
  locale,
  tasks,
  selectedIds,
  onToggleSelect,
  onAdd,
  onEdit,
}: Props) {
  const tQuadrant = useTranslations("Tasks.quadrant");
  const tMatrix = useTranslations("Tasks.matrix");
  const router = useRouter();

  const visible = useMemo(() => tasks.filter((t) => !t.done), [tasks]);
  const [items, setItems] = useState(visible);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [_isPending, startTransition] = useTransition();

  const lastIncoming = useRef<TaskRow[]>([]);
  useEffect(() => {
    if (visible !== lastIncoming.current) {
      lastIncoming.current = visible;
      setItems(visible);
    }
  }, [visible]);

  const grouped = useMemo(() => {
    const map: Record<TaskQuadrant, TaskRow[]> = {
      q1: [],
      q2: [],
      q3: [],
      q4: [],
    };
    for (const task of items) map[task.quadrant].push(task);
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
    const fromTask = items.find((t) => t.id === activeIdStr);
    if (!fromTask) return;

    let target: TaskQuadrant | null = null;
    if (QUADRANT_ORDER.includes(overIdStr as TaskQuadrant)) {
      target = overIdStr as TaskQuadrant;
    } else {
      const overTask = items.find((t) => t.id === overIdStr);
      if (overTask) target = overTask.quadrant;
    }
    if (!target || target === fromTask.quadrant) return;

    setItems((prev) =>
      prev.map((t) =>
        t.id === activeIdStr ? { ...t, quadrant: target as TaskQuadrant } : t,
      ),
    );

    startTransition(async () => {
      const result = await moveTaskQuadrantAction(
        { id: activeIdStr, quadrant: target as TaskQuadrant },
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
      <div className="grid gap-3 lg:grid-cols-2">
        {QUADRANT_ORDER.map((q) => (
          <Cell
            key={q}
            quadrant={q}
            label={tQuadrant(q)}
            shortLabel={tQuadrant(`${q}Short` as `q1Short`)}
            hint={tQuadrant(`${q}Hint` as `q1Hint`)}
            tint={QUADRANT_TINT[q]}
            tasks={grouped[q]}
            emptyLabel={tMatrix("noTasks")}
            addLabel={tMatrix("addInQuadrant")}
            onAdd={() => onAdd(q)}
            renderCard={(task) => (
              <DraggableTaskCard
                task={task}
                locale={locale}
                onEdit={() => onEdit(task)}
                isActive={activeId === task.id}
                selected={selectedIds.has(task.id)}
                onToggleSelect={() => onToggleSelect(task.id)}
              />
            )}
          />
        ))}
      </div>
    </DndContext>
  );
}

function Cell({
  quadrant,
  label,
  shortLabel,
  hint,
  tint,
  tasks,
  emptyLabel,
  addLabel,
  onAdd,
  renderCard,
}: {
  quadrant: TaskQuadrant;
  label: string;
  shortLabel: string;
  hint: string;
  tint: string;
  tasks: TaskRow[];
  emptyLabel: string;
  addLabel: string;
  onAdd: () => void;
  renderCard: (task: TaskRow) => React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: quadrant });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex min-h-[300px] flex-col rounded-xl border p-3 transition-colors",
        tint,
        isOver && "ring-2 ring-[hsl(var(--primary))]/40",
      )}
    >
      <header className="mb-2.5 flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">
            {label}
          </p>
          <p className="mt-0.5 text-sm font-semibold">{shortLabel}</p>
          <p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
            {hint}
          </p>
        </div>
        <span className="rounded bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-[hsl(var(--muted-foreground))]">
          {tasks.length}
        </span>
      </header>

      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-1.5">
          {tasks.map((task) => (
            <div key={task.id}>{renderCard(task)}</div>
          ))}
          {tasks.length === 0 && (
            <p className="px-1.5 py-3 text-center text-[11px] italic text-[hsl(var(--muted-foreground))]/60">
              {emptyLabel}
            </p>
          )}
        </div>
      </SortableContext>

      <button
        type="button"
        onClick={onAdd}
        className="mt-2 flex h-8 items-center justify-center gap-1 rounded-md text-[11px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--foreground))] focus-ring"
      >
        <Plus className="h-3 w-3" />
        {addLabel}
      </button>
    </section>
  );
}

function DraggableTaskCard({
  task,
  locale,
  onEdit,
  isActive,
  selected,
  onToggleSelect,
}: {
  task: TaskRow;
  locale: Locale;
  onEdit: () => void;
  isActive: boolean;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isActive && isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        locale={locale}
        onEdit={onEdit}
        variant="matrix"
        selected={selected}
        onToggleSelect={onToggleSelect}
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
