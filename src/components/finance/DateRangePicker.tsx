import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
}

export function DateRangePicker({ startDate, endDate, onChange }: Props) {
  const [openStart, setOpenStart] = useState(false);
  const [openEnd, setOpenEnd] = useState(false);

  const presets: { label: string; getRange: () => [Date, Date] }[] = [
    {
      label: "This month",
      getRange: () => {
        const now = new Date();
        return [new Date(now.getFullYear(), now.getMonth(), 1), now];
      },
    },
    {
      label: "Last month",
      getRange: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        return [start, end];
      },
    },
    {
      label: "Last 90 days",
      getRange: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 90);
        return [start, end];
      },
    },
    {
      label: "YTD",
      getRange: () => {
        const now = new Date();
        return [new Date(now.getFullYear(), 0, 1), now];
      },
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={openStart} onOpenChange={setOpenStart}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 justify-start border-border/60 bg-secondary/40 text-xs font-normal",
              !startDate && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
            {startDate ? format(startDate, "MMM d, yyyy") : "Start date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={startDate ?? undefined}
            onSelect={(d) => {
              onChange(d ?? null, endDate);
              setOpenStart(false);
            }}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      <span className="text-xs text-muted-foreground">→</span>

      <Popover open={openEnd} onOpenChange={setOpenEnd}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 justify-start border-border/60 bg-secondary/40 text-xs font-normal",
              !endDate && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
            {endDate ? format(endDate, "MMM d, yyyy") : "End date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={endDate ?? undefined}
            onSelect={(d) => {
              onChange(startDate, d ?? null);
              setOpenEnd(false);
            }}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      <div className="flex items-center gap-1">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => {
              const [s, e] = p.getRange();
              onChange(s, e);
            }}
            className="rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            {p.label}
          </button>
        ))}
        {(startDate || endDate) && (
          <button
            onClick={() => onChange(null, null)}
            className="ml-1 inline-flex items-center gap-1 rounded-md border border-border/60 bg-secondary/40 px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-destructive"
          >
            <X className="h-2.5 w-2.5" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
