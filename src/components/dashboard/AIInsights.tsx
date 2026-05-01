import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, TrendingUp, AlertTriangle, Zap, Info, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Insight {
  title: string;
  body: string;
  kind: "profit" | "risk" | "alert" | "info";
}

const KIND_META: Record<Insight["kind"], { icon: typeof Sparkles; iconCls: string; badgeCls: string; label: string }> = {
  profit: { icon: TrendingUp, iconCls: "bg-success/15 text-success", badgeCls: "bg-success text-white", label: "Profit" },
  risk: { icon: AlertTriangle, iconCls: "bg-warning/15 text-warning", badgeCls: "bg-warning text-white", label: "Risk" },
  alert: { icon: Zap, iconCls: "bg-destructive/15 text-destructive", badgeCls: "bg-destructive text-destructive-foreground", label: "Alert" },
  info: { icon: Info, iconCls: "bg-primary/15 text-primary", badgeCls: "bg-primary text-primary-foreground", label: "Info" },
};

export function AIInsights() {
  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["ai-insights"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-insights", { body: {} });
      if (error) throw error;
      const payload = (data as any) ?? {};
      return {
        insights: (payload.insights ?? []) as Insight[],
        message: payload.error as string | undefined,
      };
    },
    staleTime: 1000 * 60 * 30, // 30 min
    retry: false,
  });

  const insights = data?.insights ?? [];
  const softMessage = data?.message;

  return (
    <GlassCard className="h-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            AI Insights ✨
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Weekly summary · Gemini</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary"
          title="Regenerate"
        >
          {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-secondary/30" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {error instanceof Error ? error.message : "Failed to generate insights"}
        </div>
      ) : softMessage && insights.length === 0 ? (
        <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
          {softMessage}
        </div>
      ) : insights.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          Not enough data yet to generate insights.
        </p>
      ) : (
        <div className="divide-y divide-border/50">
          {insights.map((it, i) => {
            const meta = KIND_META[it.kind] ?? KIND_META.info;
            const Icon = meta.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-start gap-3">
                  <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", meta.iconCls)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-xs font-semibold leading-tight">{it.title}</p>
                      <span className={cn("rounded px-1.5 py-px text-[9px] font-bold uppercase tracking-wider", meta.badgeCls)}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{it.body}</p>
                    <button className="mt-1.5 text-[11px] font-medium text-primary transition-colors hover:text-primary/80">
                      View details →
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
