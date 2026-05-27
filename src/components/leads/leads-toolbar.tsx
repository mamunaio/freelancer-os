"use client";

import { useTranslations } from "next-intl";
import { LayoutGrid, List, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LEAD_SOURCES,
  LEAD_STAGES,
  type LeadSource,
  type LeadStage,
} from "@/features/leads/constants";
import { cn } from "@/lib/utils";

interface MemberOption {
  id: string;
  name: string;
}

export interface LeadFilterState {
  search: string;
  stage: LeadStage | "any";
  ownerId: string | "any" | "unassigned";
  source: LeadSource | "any";
}

interface Props {
  filters: LeadFilterState;
  onFiltersChange: (next: LeadFilterState) => void;
  members: MemberOption[];
  view: "kanban" | "list";
  onViewChange: (view: "kanban" | "list") => void;
}

export function LeadsToolbar({
  filters,
  onFiltersChange,
  members,
  view,
  onViewChange,
}: Props) {
  const t = useTranslations("Leads");
  const tStage = useTranslations("Leads.stage");
  const tSource = useTranslations("Leads.source");
  const tFilter = useTranslations("Leads.filter");
  const tView = useTranslations("Leads.view");

  const hasFilters =
    Boolean(filters.search.trim()) ||
    filters.stage !== "any" ||
    filters.ownerId !== "any" ||
    filters.source !== "any";

  return (
    <div className="grid gap-3 md:flex md:flex-wrap md:items-end">
      {/* Search */}
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

      <div>
        <Label className="md:sr-only">{tFilter("stage")}</Label>
        <Select
          value={filters.stage}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, stage: v as LeadStage | "any" })
          }
        >
          <SelectTrigger className="md:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{tFilter("anyStage")}</SelectItem>
            {LEAD_STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {tStage(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="md:sr-only">{tFilter("owner")}</Label>
        <Select
          value={filters.ownerId}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              ownerId: v as LeadFilterState["ownerId"],
            })
          }
        >
          <SelectTrigger className="md:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{tFilter("anyOwner")}</SelectItem>
            <SelectItem value="unassigned">{tFilter("unassigned")}</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="md:sr-only">{tFilter("source")}</Label>
        <Select
          value={filters.source}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, source: v as LeadSource | "any" })
          }
        >
          <SelectTrigger className="md:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{tFilter("anySource")}</SelectItem>
            {LEAD_SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {tSource(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={() =>
            onFiltersChange({
              search: "",
              stage: "any",
              ownerId: "any",
              source: "any",
            })
          }
          className="inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        >
          <X className="h-3 w-3" />
          {tFilter("clear")}
        </button>
      )}

      {/* View toggle */}
      <div className="ml-auto flex shrink-0 items-center gap-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] p-0.5">
        <ViewButton
          active={view === "kanban"}
          onClick={() => onViewChange("kanban")}
          icon={<LayoutGrid className="h-3 w-3" />}
          label={tView("kanban")}
        />
        <ViewButton
          active={view === "list"}
          onClick={() => onViewChange("list")}
          icon={<List className="h-3 w-3" />}
          label={tView("list")}
        />
      </div>
    </div>
  );
}

function ViewButton({
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
