"use client";

import { useTranslations } from "next-intl";
import { LayoutGrid, List, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TASK_PRIORITIES,
  type TaskPriority,
} from "@/features/tasks/constants";
import { cn } from "@/lib/utils";

interface ProjectOption {
  id: string;
  name: string;
}
interface MemberOption {
  id: string;
  name: string;
}

export interface TaskFilterState {
  search: string;
  projectId: "any" | "none" | string;
  assigneeId: "any" | "me" | "unassigned" | string;
  priority: "any" | TaskPriority;
  showDone: boolean;
}

interface Props {
  filters: TaskFilterState;
  onFiltersChange: (next: TaskFilterState) => void;
  projects: ProjectOption[];
  members: MemberOption[];
  view: "matrix" | "list";
  onViewChange: (view: "matrix" | "list") => void;
}

export function TasksToolbar({
  filters,
  onFiltersChange,
  projects,
  members,
  view,
  onViewChange,
}: Props) {
  const t = useTranslations("Tasks");
  const tFilter = useTranslations("Tasks.filter");
  const tPriority = useTranslations("Tasks.priority");
  const tView = useTranslations("Tasks.view");

  const hasFilters =
    Boolean(filters.search.trim()) ||
    filters.projectId !== "any" ||
    filters.assigneeId !== "any" ||
    filters.priority !== "any" ||
    filters.showDone;

  return (
    <div className="grid gap-3 md:flex md:flex-wrap md:items-end">
      <div className="relative md:flex-1 md:min-w-[260px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
        <Input
          value={filters.search}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value })
          }
          placeholder={t("search")}
          className="pl-9"
        />
      </div>

      <Select
        value={filters.projectId}
        onValueChange={(v) =>
          onFiltersChange({ ...filters, projectId: v })
        }
      >
        <SelectTrigger className="md:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">{tFilter("anyProject")}</SelectItem>
          <SelectItem value="none">{tFilter("noProject")}</SelectItem>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.assigneeId}
        onValueChange={(v) =>
          onFiltersChange({ ...filters, assigneeId: v })
        }
      >
        <SelectTrigger className="md:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">{tFilter("anyAssignee")}</SelectItem>
          <SelectItem value="me">{tFilter("me")}</SelectItem>
          <SelectItem value="unassigned">{tFilter("unassigned")}</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.priority}
        onValueChange={(v) =>
          onFiltersChange({
            ...filters,
            priority: v as "any" | TaskPriority,
          })
        }
      >
        <SelectTrigger className="md:w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">{tFilter("anyPriority")}</SelectItem>
          {TASK_PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>
              {tPriority(p)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <button
        type="button"
        onClick={() =>
          onFiltersChange({ ...filters, showDone: !filters.showDone })
        }
        className={
          filters.showDone
            ? "h-9 rounded-md border border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/10 px-3 text-xs font-medium text-[hsl(var(--primary))]"
            : "h-9 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-3 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        }
      >
        {tFilter("showDone")}
      </button>

      {hasFilters && (
        <button
          type="button"
          onClick={() =>
            onFiltersChange({
              search: "",
              projectId: "any",
              assigneeId: "any",
              priority: "any",
              showDone: false,
            })
          }
          className="inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        >
          <X className="h-3 w-3" />
          {tFilter("clear")}
        </button>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] p-0.5">
        <ViewBtn
          active={view === "matrix"}
          onClick={() => onViewChange("matrix")}
          icon={<LayoutGrid className="h-3 w-3" />}
          label={tView("matrix")}
        />
        <ViewBtn
          active={view === "list"}
          onClick={() => onViewChange("list")}
          icon={<List className="h-3 w-3" />}
          label={tView("list")}
        />
      </div>
    </div>
  );
}

function ViewBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-7 items-center gap-1 rounded px-2 text-[11px] font-medium transition-colors",
        active
          ? "bg-[hsl(var(--surface-1))] text-[hsl(var(--foreground))] shadow-sm"
          : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
