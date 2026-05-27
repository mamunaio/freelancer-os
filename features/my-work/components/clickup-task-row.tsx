"use client";

import { useTransition } from "react";
import { CheckCircle2, Clock, Flag, User2, Pin, PinOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MyWorkTask } from "../demo-data";
import { toggleLineupAction } from "../actions";
import { toast } from "sonner";
import { useLocale } from "next-intl";
import type { Locale } from "@/i18n/routing";

// ClickUp specific status colors
const statusConfig = {
  "todo": { label: "TO DO", color: "bg-[hsl(var(--muted))]/50 text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]" },
  "in-progress": { label: "IN PROGRESS", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  "review": { label: "REVIEW", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" }
};

const priorityConfig = {
  "high": { color: "text-red-500" },
  "medium": { color: "text-yellow-500" },
  "low": { color: "text-[hsl(var(--muted-foreground))]" }
};

export function ClickupTaskRow({ task, isLast }: { task: MyWorkTask, isLast?: boolean }) {
  const status = statusConfig[task.status] || statusConfig["todo"];
  const priority = priorityConfig[task.priority] || priorityConfig["medium"];
  const [isPending, startTransition] = useTransition();
  const locale = useLocale() as Locale;

  const handlePinToggle = () => {
    startTransition(async () => {
      const res = await toggleLineupAction(task.id, locale);
      if (res.ok) {
        toast.success(
          task.isInLineup 
            ? "Removed task from Lineup" 
            : "Pinned task to Lineup successfully!"
        );
      } else {
        toast.error(res.error || "Failed to update Lineup");
      }
    });
  };

  return (
    <div className={cn(
      "group grid grid-cols-[1fr_120px_100px_120px_80px_40px] items-center gap-4 px-4 py-2 transition-colors hover:bg-[hsl(var(--surface-2))]",
      !isLast && "border-b border-[hsl(var(--border))]/50",
      isPending && "opacity-60"
    )}>
      
      {/* 1. Task Name & Project */}
      <div className="flex items-center gap-3 min-w-0 pr-4">
        <button className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[hsl(var(--border))]/80 text-transparent transition-colors hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]">
          <CheckCircle2 className="h-3 w-3" />
        </button>
        <div className="flex flex-col min-w-0">
          <span className="truncate text-[13px] font-medium text-[hsl(var(--foreground))]">
            {task.title}
          </span>
          <span className="truncate text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            {task.project}
          </span>
        </div>
      </div>

      {/* 2. Status Badge */}
      <div className="flex items-center">
        <span className={cn(
          "flex h-6 items-center justify-center rounded border px-2 text-[9px] font-bold tracking-widest",
          status.color
        )}>
          {status.label}
        </span>
      </div>

      {/* 3. Assignee */}
      <div className="flex items-center gap-1.5">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--surface-3))] text-[9px] font-bold border border-[hsl(var(--border))]">
          <User2 className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
        </div>
      </div>

      {/* 4. Due Date */}
      <div className={cn(
        "flex items-center gap-1.5 text-[11px] font-medium",
        task.isOverdue ? "text-red-500" : "text-[hsl(var(--muted-foreground))]"
      )}>
        <Clock className="h-3 w-3" />
        {task.dueAt}
      </div>

      {/* 5. Priority Flag */}
      <div className="flex items-center justify-center">
        <Flag className={cn("h-3.5 w-3.5", priority.color)} strokeWidth={3} />
      </div>

      {/* 6. ClickUp-style Lineup Pin Icon (Hover action / toggle state) */}
      <div className="flex items-center justify-center">
        <button
          onClick={handlePinToggle}
          disabled={isPending}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md transition-all",
            task.isInLineup 
              ? "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] scale-100" 
              : "opacity-0 group-hover:opacity-100 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-3))] hover:text-[hsl(var(--foreground))]"
          )}
          title={task.isInLineup ? "Remove from Lineup" : "Pin to Lineup"}
        >
          {task.isInLineup ? (
            <Pin className="h-3.5 w-3.5 fill-current rotate-45" />
          ) : (
            <Pin className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

    </div>
  );
}
