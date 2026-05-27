"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Edit,
  MoreHorizontal,
  Trash2,
  UserCircle2,
} from "lucide-react";

import {
  deleteTaskAction,
  toggleTaskDoneAction,
} from "@/features/tasks/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PriorityBadge } from "./priority-badge";
import { cn } from "@/lib/utils";
import type { TaskRow } from "@/features/tasks/queries";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
  task: TaskRow;
  onEdit: () => void;
  /** Drag handle props from dnd-kit useSortable. */
  dragHandleProps?: {
    attributes?: Record<string, unknown>;
    listeners?: Record<string, unknown>;
    isDragging?: boolean;
  };
  /** Selection checkbox state for bulk actions. */
  selected?: boolean;
  onToggleSelect?: () => void;
  /** Compact = matrix view; comfortable = list view. */
  variant?: "matrix" | "list";
}

export function TaskCard({
  locale,
  task,
  onEdit,
  dragHandleProps,
  selected,
  onToggleSelect,
  variant = "matrix",
}: Props) {
  const t = useTranslations("Tasks.card");
  const tActions = useTranslations("Tasks.actions");
  const tWork = useTranslations("Tasks.workType");
  const format = useFormatter();
  const router = useRouter();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [_isPending, startTransition] = useTransition();

  const dragging = dragHandleProps?.isDragging ?? false;

  const dueDate = task.dueAt ? new Date(task.dueAt) : null;
  const daysLeft = dueDate
    ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  function toggleDone() {
    startTransition(async () => {
      const result = await toggleTaskDoneAction(task.id, locale);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(task.done ? tActions("uncompleted") : tActions("completed"));
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteTaskAction(task.id, locale);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(tActions("deleted"));
      setConfirmOpen(false);
      router.refresh();
    });
  }

  const compact = variant === "matrix";

  return (
    <>
      <article
        className={cn(
          "group relative flex flex-col gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-2.5 transition-all hover:border-[hsl(var(--primary))]/30 hover:bg-[hsl(var(--surface-2))]",
          dragging && "rotate-1 shadow-[var(--shadow-elegant)] ring-1 ring-[hsl(var(--primary))]/30",
          task.done && "opacity-60",
          selected && "ring-2 ring-[hsl(var(--primary))]/40",
        )}
      >
        <div className="flex items-start gap-2">
          {/* Selection checkbox */}
          {onToggleSelect && (
            <button
              type="button"
              onClick={onToggleSelect}
              onPointerDown={(e) => e.stopPropagation()}
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors focus-ring",
                selected
                  ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/20"
                  : "border-[hsl(var(--border))] opacity-0 group-hover:opacity-100",
              )}
              aria-label="Select task"
            >
              {selected && (
                <CheckCircle2 className="h-2.5 w-2.5 text-[hsl(var(--primary))]" />
              )}
            </button>
          )}

          {/* Done toggle */}
          <button
            type="button"
            onClick={toggleDone}
            onPointerDown={(e) => e.stopPropagation()}
            className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))] focus-ring"
            title={task.done ? tActions("markOpen") : tActions("markDone")}
            aria-label={task.done ? tActions("markOpen") : tActions("markDone")}
          >
            {task.done ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
            ) : (
              <Circle className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Title (drag handle) */}
          <div
            {...(dragHandleProps?.attributes ?? {})}
            {...(dragHandleProps?.listeners ?? {})}
            className={cn(
              "min-w-0 flex-1",
              dragHandleProps && "cursor-grab active:cursor-grabbing",
            )}
          >
            <p
              className={cn(
                "text-[13px] font-medium leading-tight",
                task.done && "line-through",
              )}
            >
              {task.title}
            </p>
            {!compact && task.description && (
              <p className="mt-0.5 line-clamp-2 text-[11px] text-[hsl(var(--muted-foreground))]">
                {task.description}
              </p>
            )}
          </div>

          {/* Kebab */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity hover:bg-[hsl(var(--surface-3))] hover:text-[hsl(var(--foreground))] group-hover:opacity-100 data-[state=open]:opacity-100 focus-ring"
                aria-label="Actions"
              >
                <MoreHorizontal className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-44"
            >
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  onEdit();
                }}
              >
                <Edit className="mr-2 h-3.5 w-3.5" />
                {tActions("edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={toggleDone}>
                <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                {task.done ? tActions("markOpen") : tActions("markDone")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setConfirmOpen(true);
                }}
                className="text-[hsl(var(--destructive))] focus:text-[hsl(var(--destructive))]"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                {tActions("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Meta row */}
        <div
          className={cn(
            "ml-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[hsl(var(--muted-foreground))]",
            onToggleSelect && "ml-12",
          )}
        >
          <PriorityBadge priority={task.priority} size="xs" />
          {task.project && (
            <span className="flex items-center gap-1 truncate">
              <Briefcase className="h-2.5 w-2.5" />
              {task.project.name}
            </span>
          )}
          {task.assignee && (
            <span className="flex items-center gap-1 truncate">
              <UserCircle2 className="h-2.5 w-2.5" />
              {task.assignee.name}
            </span>
          )}
          {task.estimateMinutes !== null && (
            <span className="flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {t("estimate", { value: task.estimateMinutes })}
            </span>
          )}
          {task.workType && (
            <span className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-1 text-[9px] uppercase tracking-wider">
              {tWork(task.workType)}
            </span>
          )}
          {dueDate && (
            <span
              className={cn(
                "flex items-center gap-1",
                daysLeft !== null && !task.done && daysLeft < 0 && "text-[hsl(var(--destructive))]",
                daysLeft !== null && !task.done && daysLeft >= 0 && daysLeft <= 1 && "text-[hsl(var(--warning))]",
              )}
            >
              <Calendar className="h-2.5 w-2.5" />
              {daysLeft !== null && !task.done && daysLeft < 0
                ? t("daysOverdue", { count: -daysLeft })
                : daysLeft !== null
                  ? t("daysLeft", { count: daysLeft })
                  : format.dateTime(dueDate, { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      </article>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tActions("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tActions("deleteConfirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tActions("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                remove();
              }}
              className="bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:bg-[hsl(var(--destructive))]/90"
            >
              {tActions("deleteAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
