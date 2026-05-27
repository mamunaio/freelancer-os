"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Plus, Sparkles, Target } from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { BriefingData } from "../demo-data";

interface Props {
  data: BriefingData;
}

/**
 * The dashboard's anchor section. Hero greeting, AI-style summary, and two
 * primary CTAs (deep work + quick capture). Stays as the first section in
 * every layout — it can't be hidden via the customize page.
 */
export function BriefingSection({ data }: Props) {
  const t = useTranslations("Dashboard.briefing");
  const format = useFormatter();
  const fullDate = format.dateTime(new Date(data.today), {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <section className="glass relative overflow-hidden rounded-2xl p-6 md:p-8">
      {/* Aurora wash on top-right for depth */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[image:var(--gradient-primary)] opacity-15 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative">
        <p className="eyebrow flex items-center gap-2">
          <Sparkles className="h-3 w-3 text-[hsl(var(--primary))]" />
          {t("eyebrow")} · {fullDate}
        </p>

        <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight md:text-[34px]">
          {t("greeting", { name: data.greeting })}
        </h1>

        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[hsl(var(--foreground))]/80 md:text-[15px]">
          {data.summary}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Link
            href="/time"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-glow)] transition-opacity hover:opacity-90 focus-ring"
          >
            <Target className="h-3.5 w-3.5" />
            {t("ctaDeepWork")}
          </Link>

          <button
            type="button"
            className="flex h-10 flex-1 max-w-md items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-3 text-left text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--border-strong))] hover:text-[hsl(var(--foreground))] focus-ring"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{data.quickCapturePlaceholder}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
