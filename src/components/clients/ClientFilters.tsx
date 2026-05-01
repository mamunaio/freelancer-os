import { Search, ArrowDownAZ, DollarSign, CalendarPlus, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SortKey = "revenue_desc" | "name_asc" | "date_desc";
export type StatusFilter = "all" | "lead" | "active" | "completed";

interface Props {
  search: string;
  setSearch: (v: string) => void;
  status: StatusFilter;
  setStatus: (v: StatusFilter) => void;
  sort: SortKey;
  setSort: (v: SortKey) => void;
  allTags: string[];
  selectedTags: string[];
  setSelectedTags: (v: string[]) => void;
}

export function ClientFilters({
  search, setSearch, status, setStatus, sort, setSort, allTags, selectedTags, setSelectedTags,
}: Props) {
  const toggleTag = (t: string) => {
    setSelectedTags(selectedTags.includes(t) ? selectedTags.filter((x) => x !== t) : [...selectedTags, t]);
  };

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[220px] flex-1 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="h-10 border-border/60 bg-secondary/40 pl-9"
        />
      </div>

      <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
        <SelectTrigger className="h-10 w-[140px] border-border/60 bg-secondary/40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="lead">Lead</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("h-10 border-border/60 bg-secondary/40 text-xs", selectedTags.length && "border-primary/50 text-primary")}>
            Tags{selectedTags.length > 0 && ` · ${selectedTags.length}`}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-2">
          {allTags.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">No tags yet. Add tags from the edit modal.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {allTags.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-secondary",
                      active && "bg-secondary"
                    )}
                  >
                    <span>{tag}</span>
                    {active && <Check className="h-3 w-3 text-primary" />}
                  </button>
                );
              })}
            </div>
          )}
          {selectedTags.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTags([])}
              className="mt-2 h-7 w-full text-[11px]"
            >
              Clear
            </Button>
          )}
        </PopoverContent>
      </Popover>

      <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
        <SelectTrigger className="h-10 w-[160px] border-border/60 bg-secondary/40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="revenue_desc">
            <span className="flex items-center gap-1.5"><DollarSign className="h-3 w-3" /> Revenue ↓</span>
          </SelectItem>
          <SelectItem value="name_asc">
            <span className="flex items-center gap-1.5"><ArrowDownAZ className="h-3 w-3" /> Name A-Z</span>
          </SelectItem>
          <SelectItem value="date_desc">
            <span className="flex items-center gap-1.5"><CalendarPlus className="h-3 w-3" /> Date added</span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
