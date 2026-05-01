import { useQuery } from "@tanstack/react-query";
import { GlassCard } from "@/components/GlassCard";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { daysUntil } from "@/lib/format";
import { ActiveProjectsSkeleton } from "@/components/dashboard/Skeletons";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects"> & { clients: { name: string } | null };

const deadlinePillStyle = (days: number | null) => {
  if (days === null) return "bg-secondary text-muted-foreground";
  if (days < 0) return "bg-destructive/15 text-destructive";
  if (days < 3) return "bg-destructive/15 text-destructive";
  if (days <= 7) return "bg-warning/15 text-warning";
  return "bg-success/15 text-success";
};

const deadlineLabel = (days: number | null) => {
  if (days === null) return "No deadline";
  if (days < 0) return `${-days}d overdue`;
  if (days === 0) return "Due today";
  return `${days}d left`;
};

const progressBarColor = (p: number) => {
  if (p >= 75) return "bg-gradient-to-r from-success to-success/70";
  if (p >= 40) return "bg-gradient-primary";
  return "bg-gradient-to-r from-warning to-warning/70";
};

export function ActiveProjects() {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["dashboard", "active-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, clients(name)")
        .in("status", ["planning", "in_progress", "review"])
        .order("deadline", { ascending: true, nullsFirst: false })
        .limit(6);
      if (error) throw error;
      return data as Project[];
    },
  });

  if (isLoading) return <ActiveProjectsSkeleton />;

  return (
    <GlassCard className="h-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Active Projects
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {projects.length} in progress
          </p>
        </div>
        <Link
          to="/projects"
          className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
        >
          View all →
        </Link>
      </div>

      {projects.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No active projects yet.
        </p>
      ) : (
        <motion.div
          className="space-y-1.5"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
        >
          {projects.map((p) => {
            const days = daysUntil(p.deadline);
            return (
              <motion.div
                key={p.id}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
                }}
                className="group rounded-lg border border-transparent p-3 transition-all hover:border-border/60 hover:bg-primary/[0.04]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-gradient-primary shadow-glow" />
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                    </div>
                    <p className="mt-0.5 truncate pl-4 text-xs text-muted-foreground">
                      {p.clients?.name ?? "Internal"}
                    </p>
                  </div>

                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      deadlinePillStyle(days),
                    )}
                  >
                    {deadlineLabel(days)}
                  </span>

                  <span className="ml-1 w-10 shrink-0 text-right font-display text-sm font-bold tabular-nums">
                    {p.progress}%
                  </span>
                </div>

                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary/60">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      progressBarColor(p.progress),
                    )}
                    style={{ width: `${p.progress}%` }}
                  />
                </div>

                {p.tech_stack.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {p.tech_stack.slice(0, 5).map((s) => (
                      <span
                        key={s}
                        className="rounded-md border border-border/60 bg-secondary/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </GlassCard>
  );
}
