"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  Calendar,
  Edit,
  ExternalLink,
  MoreHorizontal,
  Pin,
  PinOff,
  Trash2,
  Users,
} from "lucide-react";

import {
  deleteProjectAction,
  togglePinProjectAction,
  changeProjectStatusAction,
} from "@/features/projects/actions";
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
import { Money } from "@/components/money/money";
import { Link } from "@/i18n/navigation";
import { ProjectStatusBadge } from "./status-badge";
import { cn } from "@/lib/utils";
import type { ProjectRow } from "@/features/projects/queries";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
  project: ProjectRow;
  onEdit: () => void;
  /** When in kanban mode, hides status badge (column already shows it) and
   *  surfaces a drag handle from the parent. */
  variant?: "list" | "kanban";
  dragHandleProps?: {
    attributes?: Record<string, unknown>;
    listeners?: Record<string, unknown>;
    isDragging?: boolean;
  };
}

/**
 * Single project card. Whole surface is a Link to the detail page; inline
 * actions stop propagation so they don't navigate.
 */
export function ProjectCard({
  locale,
  project,
  onEdit,
  variant = "list",
  dragHandleProps,
}: Props) {
  const t = useTranslations("Projects.card");
  const tActions = useTranslations("Projects.actions");
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [_isPending, startTransition] = useTransition();

  const dragging = dragHandleProps?.isDragging ?? false;
  const isArchived = project.status === "archived";

  const dueDate = project.dueAt ? new Date(project.dueAt) : null;
  const daysToDue = dueDate
    ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const budgetUsd = project.budgetAmountUsd;
  const billedPct =
    budgetUsd > 0
      ? Math.min(100, Math.round((project.billedAmountUsd / budgetUsd) * 100))
      : 0;

  function pin() {
    startTransition(async () => {
      const result = await togglePinProjectAction(project.id, locale);
      if (!result.ok) toast.error(result.error);
      else
        toast.success(
          project.pinned ? tActions("unpinned") : tActions("pinned"),
        );
      router.refresh();
    });
  }

  function archive() {
    startTransition(async () => {
      const result = await changeProjectStatusAction(
        { id: project.id, status: "archived" },
        locale,
      );
      if (!result.ok) toast.error(result.error);
      else toast.success(tActions("statusChanged"));
      router.refresh();
    });
  }

  function unarchive() {
    startTransition(async () => {
      const result = await changeProjectStatusAction(
        { id: project.id, status: "in_progress" },
        locale,
      );
      if (!result.ok) toast.error(result.error);
      else toast.success(tActions("statusChanged"));
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteProjectAction(project.id, locale);
      if (!result.ok) toast.error(result.error);
      else toast.success(tActions("deleted"));
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Link
        href={`/projects/${project.id}`}
        className={cn(
          "group relative flex flex-col gap-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-3.5 transition-all hover:border-[hsl(var(--primary))]/30 hover:bg-[hsl(var(--surface-2))] focus-ring",
          dragging && "rotate-1 shadow-[var(--shadow-elegant)] ring-1 ring-[hsl(var(--primary))]/30",
        )}
      >
        {/* Top row */}
        <div
          {...(dragHandleProps?.attributes ?? {})}
          {...(dragHandleProps?.listeners ?? {})}
          className={cn(
            "flex items-start justify-between gap-2",
            variant === "kanban" && "cursor-grab active:cursor-grabbing",
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-sm font-semibold leading-tight">
              {project.pinned && (
                <Pin className="h-3 w-3 shrink-0 text-[hsl(var(--primary))]" />
              )}
              {project.name}
            </p>
            <p className="truncate text-[11px] text-[hsl(var(--muted-foreground))]">
              {project.client?.company ?? project.client?.name ?? t("noClient")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {variant === "list" && (
              <ProjectStatusBadge status={project.status} size="xs" />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="flex h-7 w-7 items-center justify-center rounded text-[hsl(var(--muted-foreground))] opacity-0 transition-all hover:bg-[hsl(var(--surface-3))] hover:text-[hsl(var(--foreground))] group-hover:opacity-100 data-[state=open]:opacity-100 focus-ring"
                  aria-label="Actions"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="w-52"
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
                <DropdownMenuItem onSelect={pin}>
                  {project.pinned ? (
                    <>
                      <PinOff className="mr-2 h-3.5 w-3.5" />
                      {tActions("unpin")}
                    </>
                  ) : (
                    <>
                      <Pin className="mr-2 h-3.5 w-3.5" />
                      {tActions("pin")}
                    </>
                  )}
                </DropdownMenuItem>
                {isArchived ? (
                  <DropdownMenuItem onSelect={unarchive}>
                    <ArchiveRestore className="mr-2 h-3.5 w-3.5" />
                    {tActions("unarchive")}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={archive}>
                    <Archive className="mr-2 h-3.5 w-3.5" />
                    {tActions("archive")}
                  </DropdownMenuItem>
                )}
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
        </div>

        {/* Tech stack */}
        {project.techStack.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.techStack.slice(0, 4).map((tech) => (
              <span
                key={tech}
                className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[10px] font-medium text-[hsl(var(--muted-foreground))]"
              >
                {tech}
              </span>
            ))}
            {project.techStack.length > 4 && (
              <span className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[10px] font-medium text-[hsl(var(--muted-foreground))]">
                +{project.techStack.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Budget bar */}
        {project.budgetAmount > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] tabular-nums text-[hsl(var(--muted-foreground))]">
              <span>
                <Money
                  amount={project.billedAmountUsd}
                  currency="USD"
                  compact
                  noTooltip
                />{" "}
                / <Money
                  amount={project.budgetAmount}
                  currency={project.budgetCurrency}
                  amountUsd={project.budgetAmountUsd}
                  rateDate={project.budgetRateDate ?? undefined}
                  compact
                />
              </span>
              <span className="font-medium">{billedPct}%</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-[hsl(var(--surface-2))]">
              <div
                className="h-full rounded-full bg-[image:var(--gradient-primary)] transition-[width] duration-500"
                style={{ width: `${billedPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer meta */}
        <div className="flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))]">
          <span className="flex items-center gap-1">
            <Users className="h-2.5 w-2.5" />
            {t("members", { count: project.members.length })}
          </span>
          {dueDate ? (
            <span
              className={cn(
                "flex items-center gap-1",
                daysToDue !== null && daysToDue < 0 && "text-[hsl(var(--destructive))]",
                daysToDue !== null &&
                  daysToDue >= 0 &&
                  daysToDue <= 3 &&
                  "text-[hsl(var(--warning))]",
              )}
            >
              <Calendar className="h-2.5 w-2.5" />
              {daysToDue !== null && daysToDue < 0
                ? t("daysOverdue", { count: -daysToDue })
                : daysToDue !== null
                  ? t("daysLeft", { count: daysToDue })
                  : null}
            </span>
          ) : (
            <span className="italic opacity-60">{t("noDueDate")}</span>
          )}
        </div>
      </Link>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tActions("deleteConfirmTitle", { name: project.name })}
            </AlertDialogTitle>
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
      <ExternalLink className="hidden" aria-hidden="true" />
    </>
  );
}
