import { Archive, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { Enums } from "@/integrations/supabase/types";

export type Status = Enums<"project_status">;

export interface ProjectFilterState {
  search: string;
  statuses: Status[];
  techs: string[];
  clientId: string; // "all" or client uuid
  year: string;     // "all" or "2024"
  showArchived: boolean;
}

export const emptyFilters: ProjectFilterState = {
  search: "",
  statuses: [],
  techs: [],
  clientId: "all",
  year: "all",
  showArchived: false,
};

const statusLabel: Record<Status, string> = {
  planning: "Planning",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed",
  on_hold: "On Hold",
};
const statusOrder: Status[] = ["planning", "in_progress", "review", "completed", "on_hold"];

interface Props {
  filters: ProjectFilterState;
  onChange: (next: ProjectFilterState) => void;
  allClients: { id: string; name: string }[];
  allTechs: string[];
  allYears: number[];
}

export function ProjectFilters({ filters, onChange, allClients, allTechs, allYears }: Props) {
  const toggle = <K extends "statuses" | "techs">(key: K, value: string) => {
    const arr = filters[key] as string[];
    onChange({
      ...filters,
      [key]: arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value],
    });
  };

  const activeCount =
    (filters.search ? 1 : 0) +
    filters.statuses.length +
    filters.techs.length +
    (filters.clientId !== "all" ? 1 : 0) +
    (filters.year !== "all" ? 1 : 0);

  const clear = () => onChange(emptyFilters);

  return (
    <div className="mb-4 space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search by project name, client, or tech…"
          className="border-border/60 bg-secondary/40 pl-9 pr-9"
        />
        {filters.search && (
          <button
            onClick={() => onChange({ ...filters, search: "" })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filter chips row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status multi-select */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn(
              "h-8 border-border/60 text-xs",
              filters.statuses.length > 0 && "border-primary/50 bg-primary/10 text-primary",
            )}>
              Status
              {filters.statuses.length > 0 && (
                <span className="ml-1.5 rounded bg-primary/20 px-1 text-[10px] font-bold tabular-nums">
                  {filters.statuses.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="glass w-48 border-border/60 p-2">
            <div className="space-y-1">
              {statusOrder.map((s) => (
                <label key={s} className="flex cursor-pointer items-center gap-2 rounded p-1.5 text-xs hover:bg-secondary/40">
                  <Checkbox
                    checked={filters.statuses.includes(s)}
                    onCheckedChange={() => toggle("statuses", s)}
                  />
                  {statusLabel[s]}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Tech multi-select */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" disabled={allTechs.length === 0} className={cn(
              "h-8 border-border/60 text-xs",
              filters.techs.length > 0 && "border-primary/50 bg-primary/10 text-primary",
            )}>
              Tech Stack
              {filters.techs.length > 0 && (
                <span className="ml-1.5 rounded bg-primary/20 px-1 text-[10px] font-bold tabular-nums">
                  {filters.techs.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="glass w-56 border-border/60 p-2">
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {allTechs.length === 0 ? (
                <p className="p-2 text-xs text-muted-foreground">No tech stacks yet</p>
              ) : allTechs.map((t) => (
                <label key={t} className="flex cursor-pointer items-center gap-2 rounded p-1.5 text-xs hover:bg-secondary/40">
                  <Checkbox
                    checked={filters.techs.includes(t)}
                    onCheckedChange={() => toggle("techs", t)}
                  />
                  {t}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Client dropdown */}
        <Select value={filters.clientId} onValueChange={(v) => onChange({ ...filters, clientId: v })}>
          <SelectTrigger className={cn(
            "h-8 w-auto min-w-[7rem] border-border/60 bg-secondary/40 text-xs",
            filters.clientId !== "all" && "border-primary/50 text-primary",
          )}>
            <SelectValue placeholder="Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {allClients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Year dropdown */}
        <Select value={filters.year} onValueChange={(v) => onChange({ ...filters, year: v })}>
          <SelectTrigger className={cn(
            "h-8 w-auto min-w-[6rem] border-border/60 bg-secondary/40 text-xs",
            filters.year !== "all" && "border-primary/50 text-primary",
          )}>
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {allYears.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Show archived toggle */}
        <label className="ml-1 flex cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-secondary/40 px-2.5 py-1 text-xs">
          <Archive className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">Show archived</span>
          <Switch
            checked={filters.showArchived}
            onCheckedChange={(v) => onChange({ ...filters, showArchived: v })}
            className="scale-75"
          />
        </label>

        {activeCount > 0 && (
          <>
            <span className="ml-1 rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              {activeCount} active
            </span>
            <Button variant="ghost" size="sm" onClick={clear} className="h-8 text-xs text-muted-foreground hover:text-destructive">
              Clear all
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
