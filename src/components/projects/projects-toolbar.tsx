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
  PROJECT_STATUSES,
  type ProjectStatus,
} from "@/features/projects/constants";
import { cn } from "@/lib/utils";

interface ClientOption {
  id: string;
  name: string;
}

export interface ProjectFilterState {
  search: string;
  status: ProjectStatus | "any";
  clientId: string | "any";
  showArchived: boolean;
}

interface Props {
  filters: ProjectFilterState;
  onFiltersChange: (next: ProjectFilterState) => void;
  clients: ClientOption[];
  view: "kanban" | "list";
  onViewChange: (view: "kanban" | "list") => void;
}

export function ProjectsToolbar({
  filters,
  onFiltersChange,
  clients,
  view,
  onViewChange,
}: Props) {
  const t = useTranslations("Projects");
  const tStatus = useTranslations("Projects.status");
  const tFilter = useTranslations("Projects.filter");
  const tView = useTranslations("Projects.view");

  const hasFilters =
    Boolean(filters.search.trim()) ||
    filters.status !== "any" ||
    filters.clientId !== "any" ||
    filters.showArchived;

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
        value={filters.status}
        onValueChange={(v) =>
          onFiltersChange({
            ...filters,
            status: v as ProjectStatus | "any",
          })
        }
      >
        <SelectTrigger className="md:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">{tFilter("anyStatus")}</SelectItem>
          {PROJECT_STATUSES.filter((s) => s !== "archived").map((s) => (
            <SelectItem key={s} value={s}>
              {tStatus(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {clients.length > 0 && (
        <Select
          value={filters.clientId}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, clientId: v })
          }
        >
          <SelectTrigger className="md:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{tFilter("anyClient")}</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <button
        type="button"
        onClick={() =>
          onFiltersChange({
            ...filters,
            showArchived: !filters.showArchived,
          })
        }
        className={
          filters.showArchived
            ? "h-9 rounded-md border border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/10 px-3 text-xs font-medium text-[hsl(var(--primary))]"
            : "h-9 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-3 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        }
      >
        {tFilter("showArchived")}
      </button>

      {hasFilters && (
        <button
          type="button"
          onClick={() =>
            onFiltersChange({
              search: "",
              status: "any",
              clientId: "any",
              showArchived: false,
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
          active={view === "kanban"}
          onClick={() => onViewChange("kanban")}
          icon={<LayoutGrid className="h-3 w-3" />}
          label={tView("kanban")}
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
