"use client";

import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Info,
  MessageSquare,
  Receipt,
  Sparkles,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { PulseData } from "../demo-data";

interface Props {
  data: PulseData;
}

const ACTIVITY_ICONS: Record<PulseData["activity"][number]["type"], LucideIcon> = {
  task: CheckCircle2,
  invoice: Receipt,
  client: Users,
  project: Briefcase,
  comment: MessageSquare,
};

const INSIGHT_STYLES: Record<
  PulseData["insights"][number]["kind"],
  { icon: LucideIcon; tint: string; bg: string; border: string }
> = {
  profit: {
    icon: TrendingUp,
    tint: "text-[hsl(var(--success))]",
    bg: "bg-[hsl(var(--success))]/10",
    border: "border-[hsl(var(--success))]/25",
  },
  risk: {
    icon: AlertTriangle,
    tint: "text-[hsl(var(--warning))]",
    bg: "bg-[hsl(var(--warning))]/10",
    border: "border-[hsl(var(--warning))]/25",
  },
  alert: {
    icon: AlertTriangle,
    tint: "text-[hsl(var(--destructive))]",
    bg: "bg-[hsl(var(--destructive))]/10",
    border: "border-[hsl(var(--destructive))]/25",
  },
  info: {
    icon: Info,
    tint: "text-[hsl(var(--info))]",
    bg: "bg-[hsl(var(--info))]/10",
    border: "border-[hsl(var(--info))]/25",
  },
};

/**
 * Two-column section: activity feed (left) and AI insights (right).
 */
export function PulseSection({ data }: Props) {
  const t = useTranslations("Dashboard.pulse");

  return (
    <section className="space-y-3">
      <header>
        <h2 className="font-display text-lg font-semibold tracking-tight">
          {t("title")}
        </h2>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {/* Activity feed */}
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-4">
          <p className="eyebrow mb-3">{t("activityTitle")}</p>
          <ul className="space-y-2.5">
            {data.activity.map((a) => {
              const Icon = ACTIVITY_ICONS[a.type];
              return (
                <li key={a.id} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--surface-2))] text-[hsl(var(--muted-foreground))]">
                    <Icon className="h-3 w-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-relaxed">
                      <span className="font-medium">{a.actor}</span>{" "}
                      <span className="text-[hsl(var(--muted-foreground))]">
                        {a.action}
                      </span>{" "}
                      <span className="font-medium">{a.target}</span>
                    </p>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]/70">
                      {a.relative}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* AI insights */}
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-4">
          <p className="eyebrow mb-3 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-[hsl(var(--primary))]" />
            {t("insightsTitle")}
          </p>
          <ul className="space-y-3">
            {data.insights.map((insight) => {
              const style = INSIGHT_STYLES[insight.kind];
              const Icon = style.icon;
              return (
                <li
                  key={insight.id}
                  className={cn(
                    "rounded-lg border p-2.5",
                    style.bg,
                    style.border,
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", style.tint)} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">{insight.title}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                        {insight.body}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
