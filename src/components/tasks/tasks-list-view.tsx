"use client";

import { useTranslations } from "next-intl";

import { TaskCard } from "./task-card";
import type { TaskRow } from "@/features/tasks/queries";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
  tasks: TaskRow[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onEdit: (task: TaskRow) => void;
}

/**
 * Flat list grouped by quadrant. Density-friendly alternative to the
 * matrix when scanning lots of tasks.
 */
export function TasksListView({
  locale,
  tasks,
  selectedIds,
  onToggleSelect,
  onEdit,
}: Props) {
  const tQuadrant = useTranslations("Tasks.quadrant");

  const groups: Array<{ id: string; label: string; tasks: TaskRow[] }> = [
    {
      id: "q1",
      label: tQuadrant("q1"),
      tasks: tasks.filter((t) => t.quadrant === "q1"),
    },
    {
      id: "q2",
      label: tQuadrant("q2"),
      tasks: tasks.filter((t) => t.quadrant === "q2"),
    },
    {
      id: "q3",
      label: tQuadrant("q3"),
      tasks: tasks.filter((t) => t.quadrant === "q3"),
    },
    {
      id: "q4",
      label: tQuadrant("q4"),
      tasks: tasks.filter((t) => t.quadrant === "q4"),
    },
  ];

  return (
    <div className="space-y-5">
      {groups.map((group) =>
        group.tasks.length > 0 ? (
          <section key={group.id} className="space-y-2">
            <p className="eyebrow">{group.label}</p>
            <ul className="space-y-1.5">
              {group.tasks.map((task) => (
                <li key={task.id}>
                  <TaskCard
                    task={task}
                    locale={locale}
                    onEdit={() => onEdit(task)}
                    variant="list"
                    selected={selectedIds.has(task.id)}
                    onToggleSelect={() => onToggleSelect(task.id)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null,
      )}
    </div>
  );
}
