import { ArrowUpRight, ArrowDownRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down";
  icon: LucideIcon;
  accent?: "primary" | "accent" | "success" | "warning";
  spark?: number[];
}

const accentTheme = {
  primary: {
    iconWrap: "bg-primary/15 text-primary",
    tint: "from-primary/[0.08] via-primary/[0.03] to-transparent",
    stroke: "hsl(var(--primary))",
    fillId: "spark-primary",
  },
  accent: {
    iconWrap: "bg-accent/15 text-accent",
    tint: "from-accent/[0.10] via-accent/[0.03] to-transparent",
    stroke: "hsl(var(--accent))",
    fillId: "spark-accent",
  },
  success: {
    iconWrap: "bg-success/15 text-success",
    tint: "from-success/[0.10] via-success/[0.03] to-transparent",
    stroke: "hsl(var(--success))",
    fillId: "spark-success",
  },
  warning: {
    iconWrap: "bg-warning/15 text-warning",
    tint: "from-warning/[0.12] via-warning/[0.03] to-transparent",
    stroke: "hsl(var(--warning))",
    fillId: "spark-warning",
  },
};

export function StatCard({
  label,
  value,
  delta,
  trend = "up",
  icon: Icon,
  accent = "primary",
  spark,
}: StatCardProps) {
  const theme = accentTheme[accent];
  const series = (spark && spark.length > 1 ? spark : [0, 0]).map((v, i) => ({ i, v }));

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/60 bg-card p-5",
        "shadow-[0_1px_3px_hsl(var(--foreground)/0.04)] transition-shadow duration-300",
        "hover:shadow-[0_12px_32px_-12px_hsl(var(--foreground)/0.18)]",
      )}
    >
      {/* gradient tint */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90",
          theme.tint,
        )}
      />

      <div className="relative">
        <div className="flex items-start justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              theme.iconWrap,
            )}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </div>
        </div>

        <p className="mt-3 font-display text-[34px] font-bold leading-none tracking-tight">
          {value}
        </p>

        {delta && (
          <div
            className={cn(
              "mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold",
              trend === "up" ? "text-success" : "text-destructive",
            )}
          >
            {trend === "up" ? (
              <ArrowUpRight className="h-3 w-3" strokeWidth={2.6} />
            ) : (
              <ArrowDownRight className="h-3 w-3" strokeWidth={2.6} />
            )}
            <span>{delta}</span>
          </div>
        )}

        {/* sparkline */}
        <div className="-mx-2 mt-3 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={theme.fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.stroke} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={theme.stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={theme.stroke}
                strokeWidth={1.75}
                fill={`url(#${theme.fillId})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
