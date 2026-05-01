import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmtCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Client = Tables<"clients"> & { projects?: { id: string }[] };
type Stage = Enums<"pipeline_stage">;

const stages: { id: Stage; label: string; accent: string }[] = [
  { id: "lead", label: "Lead", accent: "border-warning/40" },
  { id: "proposal_sent", label: "Proposal Sent", accent: "border-primary/40" },
  { id: "negotiation", label: "Negotiation", accent: "border-accent/40" },
  { id: "active", label: "Active", accent: "border-success/40" },
  { id: "completed", label: "Completed", accent: "border-muted" },
];

export function PipelineBoard({ clients }: { clients: Client[] }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);

  const move = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: Stage }) => {
      const { error } = await supabase.from("clients").update({ pipeline_stage: stage }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {stages.map((stage) => {
        const items = clients.filter((c) => c.pipeline_stage === stage.id);
        const total = items.reduce((s, c) => s + Number(c.total_revenue || 0), 0);
        const isOver = overStage === stage.id;

        return (
          <div
            key={stage.id}
            onDragOver={(e) => { e.preventDefault(); setOverStage(stage.id); }}
            onDragLeave={() => setOverStage((s) => (s === stage.id ? null : s))}
            onDrop={() => {
              if (draggingId) {
                const c = clients.find((x) => x.id === draggingId);
                if (c && c.pipeline_stage !== stage.id) {
                  move.mutate({ id: draggingId, stage: stage.id });
                }
              }
              setOverStage(null);
              setDraggingId(null);
            }}
            className={cn(
              "rounded-xl border-2 bg-secondary/20 p-3 transition-colors",
              stage.accent,
              isOver && "bg-primary/10 border-primary/60"
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider">{stage.label}</h3>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {items.length} · {fmtCurrency(total)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {items.length === 0 && (
                <p className="rounded-md border border-dashed border-border/40 px-2 py-4 text-center text-[10px] text-muted-foreground">
                  Drop here
                </p>
              )}
              {items.map((c) => (
                <motion.div
                  key={c.id}
                  layout
                  draggable
                  onDragStart={() => setDraggingId(c.id)}
                  onDragEnd={() => setDraggingId(null)}
                  onClick={() => navigate(`/clients/${c.id}`)}
                  whileHover={{ scale: 1.02 }}
                  className={cn(
                    "glass cursor-pointer rounded-lg p-3 transition-opacity",
                    draggingId === c.id && "opacity-40"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{c.name}</p>
                      {c.company && <p className="truncate text-[10px] text-muted-foreground">{c.company}</p>}
                    </div>
                    <div className="h-7 w-7 shrink-0 rounded-md bg-gradient-primary text-[10px] font-semibold text-primary-foreground flex items-center justify-center">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <div className="mt-2 flex items-end justify-between">
                    <span className="font-display text-sm font-semibold gradient-text">
                      {fmtCurrency(Number(c.total_revenue))}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {c.projects?.length ?? 0} proj
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
