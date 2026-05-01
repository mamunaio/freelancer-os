import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/GlassCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Archive, ArrowLeft, Download, RotateCcw, Search, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { fmtDate, fmtCurrency } from "@/lib/format";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;
type ProjectRow = Project & { clients: { id: string; name: string } | null };

const ProjectsArchivePage = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects-archive"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, clients(id, name)")
        .eq("is_archived", true)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as ProjectRow[];
    },
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").update({ is_archived: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Project restored to active");
      qc.invalidateQueries({ queryKey: ["projects-archive"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter((p) => {
      const haystack = [p.name, p.clients?.name ?? "", ...(p.tech_stack ?? [])].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [projects, search]);

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    const headers = ["Name", "Client", "Status", "Progress", "Budget", "Start Date", "Deadline", "Completed On", "Tech Stack"];
    const escape = (v: string | number | null | undefined) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = filtered.map((p) => [
      p.name,
      p.clients?.name ?? "",
      p.status,
      `${p.progress}%`,
      Number(p.budget ?? 0).toFixed(2),
      p.start_date ?? "",
      p.deadline ?? "",
      fmtDate(p.updated_at),
      (p.tech_stack ?? []).join("; "),
    ].map(escape).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `projects-archive-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} project${filtered.length === 1 ? "" : "s"}`);
  };

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Delivery"
        title="Project Archive"
        subtitle="Completed and inactive projects, kept for your records."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="border-border/60">
              <Link to="/projects">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to projects
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={exportCsv}
              disabled={filtered.length === 0}
              className="border-border/60"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>
        }
      />

      <div className="mb-4 relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search archived by name, client, or tech…"
          className="border-border/60 bg-secondary/40 pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="No archived projects"
          description="Projects auto-archive 30 days after completion, or you can archive them manually from the project edit dialog."
          action={
            <Button asChild variant="outline" className="border-border/60">
              <Link to="/projects">Back to projects</Link>
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matches"
          description="No archived projects match your search."
          action={
            <Button variant="outline" onClick={() => setSearch("")} className="border-border/60">
              Clear search
            </Button>
          }
        />
      ) : (
        <motion.div
          className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
        >
          {filtered.map((p) => {
            const budget = Number(p.budget ?? 0);
            return (
              <motion.div
                key={p.id}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
                }}
              >
                <GlassCard className="flex h-full flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => navigate(`/projects/${p.id}`)}
                      className="text-left text-sm font-semibold leading-tight hover:text-primary"
                    >
                      {p.name}
                    </button>
                    <span className="rounded border border-border/60 bg-secondary/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                      {p.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <p className="text-muted-foreground">Client</p>
                      <p className="font-medium">{p.clients?.name ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Budget</p>
                      <p className="font-medium tabular-nums">{fmtCurrency(budget)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Completed</p>
                      <p className="font-medium">{fmtDate(p.updated_at)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Progress</p>
                      <p className="font-medium tabular-nums">{p.progress}%</p>
                    </div>
                  </div>

                  {p.tech_stack && p.tech_stack.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {p.tech_stack.slice(0, 6).map((t) => (
                        <span
                          key={t}
                          className="rounded border border-border/60 bg-secondary/30 px-1.5 py-0.5 text-[9px] text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                      {p.tech_stack.length > 6 && (
                        <span className="text-[9px] text-muted-foreground">
                          +{p.tech_stack.length - 6}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-auto flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-border/60 text-xs"
                      onClick={() => restore.mutate(p.id)}
                      disabled={restore.isPending}
                    >
                      <RotateCcw className="mr-1.5 h-3 w-3" /> Restore
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </AppLayout>
  );
};

export default ProjectsArchivePage;
