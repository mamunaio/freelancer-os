import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { daysUntil } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects"> & { clients: { name: string } | null };

const pillStyle = (days: number | null) => {
  if (days === null) return "bg-secondary text-muted-foreground";
  if (days < 0 || days < 3) return "bg-destructive/15 text-destructive";
  if (days <= 7) return "bg-warning/15 text-warning";
  return "bg-success/15 text-success";
};
const label = (days: number | null) => {
  if (days === null) return "—";
  if (days < 0) return `${-days}d late`;
  if (days === 0) return "Today";
  return `${days}d`;
};

export function UpcomingDeadlines() {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["dashboard", "upcoming-deadlines"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, deadline, clients(name)")
        .in("status", ["planning", "in_progress", "review"])
        .gte("deadline", today)
        .order("deadline", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data as Project[];
    },
  });

  return (
    <GlassCard>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Upcoming Deadlines
        </p>
        <Link to="/projects" className="text-xs font-medium text-primary hover:text-primary/80">
          All →
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-secondary/30" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          No upcoming deadlines.
        </p>
      ) : (
        <div className="space-y-1">
          {projects.map((p) => {
            const days = daysUntil(p.deadline);
            return (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-primary/[0.04]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {p.clients?.name ?? "Internal"}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums",
                    pillStyle(days),
                  )}
                >
                  {label(days)}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
