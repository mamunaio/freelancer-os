import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Project = Tables<"projects"> & { clients?: { name: string } | null };
type Status = Enums<"project_status">;

const statusColors: Record<Status, string> = {
  planning: "bg-muted-foreground/40 hover:bg-muted-foreground/60",
  in_progress: "bg-primary hover:bg-primary/80",
  review: "bg-warning hover:bg-warning/80",
  completed: "bg-success hover:bg-success/80",
  on_hold: "bg-destructive hover:bg-destructive/80",
};

const statusBorder: Record<Status, string> = {
  planning: "border-muted-foreground/40",
  in_progress: "border-primary",
  review: "border-warning",
  completed: "border-success",
  on_hold: "border-destructive",
};

const DAY_MS = 86400000;
const PX_PER_DAY = 18; // base scale

interface DragState {
  id: string;
  edge: "start" | "end" | "move";
  startX: number;
  origStart: number;
  origEnd: number;
}

export function GanttTimeline({ projects }: { projects: Project[] }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [overrides, setOverrides] = useState<Record<string, { start_date?: string; deadline?: string }>>({});

  // Filter projects with both dates
  const dated = useMemo(() => {
    const out: { p: Project; start: number; end: number }[] = [];
    projects.forEach((p) => {
      const s = p.start_date ? new Date(p.start_date).getTime() : null;
      const e = p.deadline ? new Date(p.deadline).getTime() : null;
      if (s !== null && e !== null && e >= s) out.push({ p, start: s, end: e });
    });
    return out.sort((a, b) => a.start - b.start);
  }, [projects]);

  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (dated.length === 0) {
      const now = Date.now();
      return { minDate: now, maxDate: now + 60 * DAY_MS, totalDays: 60 };
    }
    const minD = Math.min(...dated.map((d) => d.start)) - 7 * DAY_MS;
    const maxD = Math.max(...dated.map((d) => d.end)) + 7 * DAY_MS;
    return { minDate: minD, maxDate: maxD, totalDays: Math.ceil((maxD - minD) / DAY_MS) };
  }, [dated]);

  // Generate month markers
  const months = useMemo(() => {
    const out: { label: string; offset: number; isFirst: boolean }[] = [];
    const cur = new Date(minDate);
    cur.setDate(1);
    while (cur.getTime() <= maxDate) {
      const offset = Math.max(0, (cur.getTime() - minDate) / DAY_MS);
      out.push({
        label: cur.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        offset,
        isFirst: cur.getMonth() === 0,
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return out;
  }, [minDate, maxDate]);

  const todayOffset = (Date.now() - minDate) / DAY_MS;

  const updateDates = useMutation({
    mutationFn: async ({ id, start_date, deadline }: { id: string; start_date: string; deadline: string }) => {
      const { error } = await supabase.from("projects").update({ start_date, deadline }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  // Mouse drag handlers
  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - drag.startX;
      const dDays = Math.round(dx / PX_PER_DAY);
      const item = dated.find((d) => d.p.id === drag.id);
      if (!item) return;

      let newStart = drag.origStart;
      let newEnd = drag.origEnd;
      if (drag.edge === "start") newStart = Math.min(drag.origEnd - DAY_MS, drag.origStart + dDays * DAY_MS);
      else if (drag.edge === "end") newEnd = Math.max(drag.origStart + DAY_MS, drag.origEnd + dDays * DAY_MS);
      else {
        newStart = drag.origStart + dDays * DAY_MS;
        newEnd = drag.origEnd + dDays * DAY_MS;
      }

      setOverrides((o) => ({
        ...o,
        [drag.id]: {
          start_date: new Date(newStart).toISOString().slice(0, 10),
          deadline: new Date(newEnd).toISOString().slice(0, 10),
        },
      }));
    };

    const onUp = () => {
      const o = overrides[drag.id];
      if (o?.start_date && o?.deadline) {
        updateDates.mutate({ id: drag.id, start_date: o.start_date, deadline: o.deadline });
        toast.success("Dates updated");
      }
      setDrag(null);
      setOverrides((cur) => {
        const next = { ...cur };
        delete next[drag.id];
        return next;
      });
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, overrides]);

  if (dated.length === 0) {
    return (
      <GlassCard className="py-12 text-center text-sm text-muted-foreground">
        Add a start date and deadline to your projects to see them on the timeline.
      </GlassCard>
    );
  }

  const totalWidth = totalDays * PX_PER_DAY;

  return (
    <GlassCard className="overflow-hidden p-0">
      <div className="overflow-x-auto" ref={containerRef}>
        <div style={{ width: totalWidth + 220, minWidth: "100%" }}>
          {/* Month header */}
          <div className="sticky top-0 z-10 flex border-b border-border/40 bg-background/80 backdrop-blur">
            <div className="w-[220px] shrink-0 border-r border-border/40 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Project
            </div>
            <div className="relative flex-1" style={{ width: totalWidth }}>
              <div className="flex h-full">
                {months.map((m, i) => {
                  const next = months[i + 1];
                  const widthDays = next ? next.offset - m.offset : totalDays - m.offset;
                  return (
                    <div
                      key={i}
                      style={{ width: widthDays * PX_PER_DAY }}
                      className={cn(
                        "border-r border-border/30 px-2 py-3 text-[10px] uppercase tracking-wider",
                        m.isFirst ? "font-semibold text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {m.label}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Today line */}
          {todayOffset >= 0 && todayOffset <= totalDays && (
            <div
              className="pointer-events-none absolute z-0 ml-[220px] h-full w-px bg-primary/60"
              style={{ left: todayOffset * PX_PER_DAY, top: 0, bottom: 0, height: dated.length * 56 + 50 }}
            />
          )}

          {/* Rows */}
          <div className="relative">
            {dated.map(({ p, start, end }, idx) => {
              const o = overrides[p.id];
              const sTs = o?.start_date ? new Date(o.start_date).getTime() : start;
              const eTs = o?.deadline ? new Date(o.deadline).getTime() : end;
              const left = ((sTs - minDate) / DAY_MS) * PX_PER_DAY;
              const width = Math.max(PX_PER_DAY, ((eTs - sTs) / DAY_MS) * PX_PER_DAY);
              const isDragging = drag?.id === p.id;

              return (
                <div
                  key={p.id}
                  className={cn(
                    "flex h-14 items-center border-b border-border/20 transition-colors",
                    idx % 2 === 0 ? "bg-secondary/10" : ""
                  )}
                >
                  <div
                    className="w-[220px] shrink-0 cursor-pointer border-r border-border/40 px-4 truncate"
                    onClick={() => navigate(`/projects/${p.id}`)}
                  >
                    <p className="truncate text-xs font-semibold">{p.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {p.clients?.name ?? "No client"}
                    </p>
                  </div>
                  <div className="relative flex-1" style={{ width: totalWidth, height: 56 }}>
                    <motion.div
                      layout={!isDragging}
                      onMouseDown={(e) => {
                        const target = e.target as HTMLElement;
                        const edge = target.dataset.edge as "start" | "end" | undefined;
                        setDrag({
                          id: p.id,
                          edge: edge ?? "move",
                          startX: e.clientX,
                          origStart: sTs,
                          origEnd: eTs,
                        });
                        e.preventDefault();
                      }}
                      style={{ left, width }}
                      className={cn(
                        "group absolute top-1/2 flex h-7 -translate-y-1/2 cursor-grab items-center overflow-hidden rounded-md border-l-4 text-[10px] text-white shadow-sm",
                        statusColors[p.status],
                        statusBorder[p.status],
                        isDragging && "cursor-grabbing ring-2 ring-primary/60"
                      )}
                    >
                      <div
                        data-edge="start"
                        className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize bg-white/30 opacity-0 group-hover:opacity-100"
                      />
                      <span className="px-2 truncate font-medium pointer-events-none">
                        {p.name} · {p.progress}%
                      </span>
                      <div
                        data-edge="end"
                        className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize bg-white/30 opacity-0 group-hover:opacity-100"
                      />
                    </motion.div>
                    {isDragging && o && (
                      <div
                        className="absolute top-0 z-20 -translate-y-full rounded-md bg-foreground px-2 py-1 text-[10px] text-background shadow-lg"
                        style={{ left }}
                      >
                        {fmtDate(o.start_date!)} → {fmtDate(o.deadline!)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 border-t border-border/40 px-4 py-3 text-[10px] text-muted-foreground">
        <span className="font-semibold uppercase tracking-wider">Legend:</span>
        {(Object.keys(statusColors) as Status[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cn("h-2 w-3 rounded", statusColors[s])} />
            {s.replace("_", " ")}
          </span>
        ))}
        <span className="ml-auto text-[10px]">Drag bars to move · Drag edges to resize</span>
      </div>
    </GlassCard>
  );
}
