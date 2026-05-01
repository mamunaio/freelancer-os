import { useQuery } from "@tanstack/react-query";
import { GlassCard } from "@/components/GlassCard";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  text: string;
  at: string; // ISO
  kind: "project" | "task" | "invoice" | "client";
}

const dotColor: Record<ActivityItem["kind"], string> = {
  project: "bg-primary",
  task: "bg-warning",
  invoice: "bg-success",
  client: "bg-accent",
};

const timeAgo = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export function RecentActivity() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["dashboard", "recent-activity"],
    queryFn: async (): Promise<ActivityItem[]> => {
      const [projects, tasks, finance, clients] = await Promise.all([
        supabase.from("projects").select("id, name, updated_at").order("updated_at", { ascending: false }).limit(4),
        supabase.from("tasks").select("id, title, updated_at, done").order("updated_at", { ascending: false }).limit(4),
        supabase
          .from("finance_entries")
          .select("id, description, amount, kind, created_at")
          .order("created_at", { ascending: false })
          .limit(4),
        supabase.from("clients").select("id, name, updated_at").order("updated_at", { ascending: false }).limit(3),
      ]);

      const merged: ActivityItem[] = [];
      (projects.data ?? []).forEach((p: any) =>
        merged.push({ id: `p-${p.id}`, text: `Project "${p.name}" updated`, at: p.updated_at, kind: "project" }),
      );
      (tasks.data ?? []).forEach((t: any) =>
        merged.push({
          id: `t-${t.id}`,
          text: t.done ? `Task "${t.title}" completed` : `Task "${t.title}" updated`,
          at: t.updated_at,
          kind: "task",
        }),
      );
      (finance.data ?? []).forEach((f: any) =>
        merged.push({
          id: `f-${f.id}`,
          text: `${f.kind === "income" ? "Income" : "Expense"} · ${f.description ?? "entry"}`,
          at: f.created_at,
          kind: "invoice",
        }),
      );
      (clients.data ?? []).forEach((c: any) =>
        merged.push({ id: `c-${c.id}`, text: `Client "${c.name}" updated`, at: c.updated_at, kind: "client" }),
      );

      return merged
        .filter((i) => i.at)
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        .slice(0, 6);
    },
  });

  return (
    <GlassCard>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Recent Activity
      </p>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded-md bg-secondary/30" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">No recent activity.</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((it) => (
            <li key={it.id} className="flex items-start gap-2.5">
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full shadow-sm", dotColor[it.kind])} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{it.text}</p>
                <p className="text-[10px] text-muted-foreground">{timeAgo(it.at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}
