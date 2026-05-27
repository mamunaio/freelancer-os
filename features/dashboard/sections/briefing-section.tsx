"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Plus, Sparkles, Target } from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { BriefingData } from "../demo-data";
import { CommandPalette } from "@/components/layout/command-palette";
import { DeepWorkModal } from "@/components/layout/deep-work-modal";

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
  const [cmdOpen, setCmdOpen] = useState(false);
  const [deepWorkOpen, setDeepWorkOpen] = useState(false);
  const format = useFormatter();
  const fullDate = format.dateTime(new Date(data.today), {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <section className="relative overflow-hidden rounded-2xl p-5 md:p-6 border border-[hsl(var(--border))]/60 bg-[hsl(var(--surface-1))] shadow-sm">
      <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="eyebrow flex items-center gap-2 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
            {t("eyebrow")} · {fullDate}
          </p>
          <h1 className="font-display text-2xl font-bold leading-tight tracking-tight md:text-3xl text-[hsl(var(--foreground))]">
            {t("greeting", { name: data.greeting })}
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[hsl(var(--muted-foreground))]">
            {data.summary}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setCmdOpen(true)}
            className="flex h-9 items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-3 text-sm text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--border))] focus-ring"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{data.quickCapturePlaceholder}</span>
            <span className="sm:hidden">Capture</span>
          </button>
          
          <button
            type="button"
            onClick={() => setDeepWorkOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-sm transition-opacity hover:opacity-90 focus-ring"
          >
            <Target className="h-4 w-4" />
            {t("ctaDeepWork")}
          </button>
        </div>
      </div>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      <DeepWorkModal open={deepWorkOpen} onOpenChange={setDeepWorkOpen} />
    </section>
  );
}
