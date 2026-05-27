"use client";

import { useState } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { MyWorkTask } from "../demo-data";
import { ClickupTaskRow } from "./clickup-task-row";

interface Props {
  title: string;
  color: string;
  tasks: MyWorkTask[];
  defaultOpen?: boolean;
}

export function ClickupTaskGroup({ title, color, tasks, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  if (tasks.length === 0) return null;

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} className="mb-6">
      
      {/* Group Header */}
      <Collapsible.Trigger className="group flex w-full items-center gap-2 rounded-md py-1.5 hover:bg-[hsl(var(--surface-2))] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]">
        <div className="flex h-5 w-5 items-center justify-center rounded text-[hsl(var(--muted-foreground))]">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </div>
        
        <span className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest ${color}`}>
          {title}
          <span className="flex h-4 items-center rounded-full bg-[hsl(var(--surface-3))] px-1.5 text-[9px] text-[hsl(var(--muted-foreground))]">
            {tasks.length}
          </span>
        </span>
      </Collapsible.Trigger>

      {/* Group Content (Table) */}
      <Collapsible.Content className="mt-2 overflow-hidden animate-in slide-in-from-top-1 fade-in duration-200">
        <div className="rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] shadow-sm">
          
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_120px_100px_120px_80px_40px] gap-4 border-b border-[hsl(var(--border))]/60 bg-[hsl(var(--surface-1))]/50 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] rounded-t-xl">
            <div>Task Name</div>
            <div>Status</div>
            <div>Assignee</div>
            <div>Due Date</div>
            <div className="text-center">Priority</div>
            <div></div>
          </div>

          {/* Table Rows */}
          <div className="flex flex-col">
            {tasks.map((task, idx) => (
              <ClickupTaskRow key={task.id} task={task} isLast={idx === tasks.length - 1} />
            ))}
          </div>
          
        </div>
      </Collapsible.Content>
      
    </Collapsible.Root>
  );
}
