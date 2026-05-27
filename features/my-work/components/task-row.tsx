import { CheckCircle2, Clock, Play, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MyWorkTask } from "../demo-data";

export function TaskRow({ task }: { task: MyWorkTask }) {
  return (
    <div className="group flex items-center justify-between gap-4 rounded-lg border border-transparent px-3 py-2.5 transition-all hover:bg-[hsl(var(--surface-2))] hover:border-[hsl(var(--border))]/50">
      
      {/* Left section: Checkbox + Title */}
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <button className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]">
          <CheckCircle2 className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        
        <div className="flex flex-col min-w-0">
          <span className="truncate text-sm font-medium text-[hsl(var(--foreground))]">
            {task.title}
          </span>
          <span className="truncate text-xs text-[hsl(var(--muted-foreground))]">
            {task.client} · {task.project}
          </span>
        </div>
      </div>

      {/* Right section: Metadata + Actions */}
      <div className="flex shrink-0 items-center gap-4">
        {/* Priority Badge */}
        {task.priority === "high" && (
          <span className="hidden sm:inline-flex items-center rounded-full bg-[hsl(var(--destructive))]/10 px-2 py-0.5 text-[10px] font-medium text-[hsl(var(--destructive))]">
            High Priority
          </span>
        )}
        
        {/* Due Date */}
        <span className={cn(
          "flex items-center gap-1.5 text-xs font-medium w-24 justify-end",
          task.isOverdue ? "text-[hsl(var(--destructive))]" : "text-[hsl(var(--muted-foreground))]"
        )}>
          <Clock className="h-3.5 w-3.5" />
          {task.dueAt}
        </span>

        {/* Action Buttons (visible on hover) */}
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button className="flex h-7 w-7 items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary))]/10 hover:text-[hsl(var(--primary))] transition-colors" title="Start Timer">
            <Play className="h-3.5 w-3.5" />
          </button>
          <button className="flex h-7 w-7 items-center justify-center rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-3))] hover:text-[hsl(var(--foreground))] transition-colors" title="More options">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
