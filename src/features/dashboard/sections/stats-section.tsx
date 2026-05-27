"use client";

import { useTranslations } from "next-intl";
import {
  Banknote,
  Briefcase,
  Heart,
  Repeat2,
  Timer,
  TrendingDown,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Money } from "@/components/money/money";
import { cn } from "@/lib/utils";
import type { StatsData } from "../demo-data";

interface Props {
  data: StatsData;
}

/**
 * Six compact tiles. Used as the "skim layer" — anything important is also
 * surfaced more prominently elsewhere in the layout.
 */
export function StatsSection({ data }: Props) {
  const t = useTranslations("Dashboard.stats");

  return (
    <section className="space-y-3">
      <header>
        <h2 className="font-display text-lg font-semibold tracking-tight">
          {t("title")}
        </h2>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Tile
          icon={Users}
          label={t("activeClients")}
          value={data.activeClients.toString()}
          delta={data.activeClientsDelta}
        />
        <Tile
          icon={Briefcase}
          label={t("activeProjects")}
          value={data.activeProjects.toString()}
          delta={data.activeProjectsDelta}
        />
        <Tile
          icon={Timer}
          label={t("billableHours")}
          value={`${data.billableHours}h`}
          subtitle={t("billableTarget", { target: `${data.billableHoursTarget}h` })}
        />
        <Tile
          icon={Banknote}
          label={t("cashPosition")}
          value={
            <Money
              amount={data.cashPosition}
              currency={data.currency}
              compact
              noTooltip
            />
          }
        />
        <Tile
          icon={Repeat2}
          label={t("retainerMrr")}
          value={
            <Money
              amount={data.retainerMrr}
              currency={data.currency}
              compact
              noTooltip
            />
          }
        />
        <Tile
          icon={Heart}
          label={t("satisfaction")}
          value={`${data.satisfaction}`}
          subtitle="NPS"
        />
      </div>
    </section>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  delta,
  subtitle,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  delta?: number;
  subtitle?: string;
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
          {label}
        </p>
        <Icon className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]/60" />
      </div>

      <p className="mt-2 font-display text-xl font-bold tabular-nums tracking-tight">
        {value}
      </p>

      {(typeof delta === "number" || subtitle) && (
        <div className="mt-1 flex items-center gap-1 text-[10px] text-[hsl(var(--muted-foreground))]">
          {typeof delta === "number" && delta !== 0 && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                positive
                  ? "text-[hsl(var(--success))]"
                  : "text-[hsl(var(--destructive))]",
              )}
            >
              {positive ? (
                <TrendingUp className="h-2.5 w-2.5" />
              ) : (
                <TrendingDown className="h-2.5 w-2.5" />
              )}
              {Math.abs(delta)}
            </span>
          )}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
