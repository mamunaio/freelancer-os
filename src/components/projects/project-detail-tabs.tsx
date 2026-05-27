"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Activity, KanbanSquare, ListChecks, Map } from "lucide-react";

import { MilestonesTab } from "./milestones-tab";
import { cn } from "@/lib/utils";
import type { ProjectMilestoneRow } from "@/features/projects/queries";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
  projectId: string;
  milestones: ProjectMilestoneRow[];
  canManage: boolean;
}

type TabId = "overview" | "tasks" | "milestones" | "activity";

const TAB_ICONS: Record<TabId, React.ComponentType<{ className?: string }>> = {
  overview: KanbanSquare,
  tasks: ListChecks,
  milestones: Map,
  activity: Activity,
};

export function ProjectDetailTabs({
  locale,
  projectId,
  milestones,
  canManage,
}: Props) {
  const t = useTranslations("Projects.detail.tabs");
  const tDetail = useTranslations("Projects.detail");
  const [tab, setTab] = useState<TabId>("milestones");

  const tabs: TabId[] = ["overview", "milestones", "tasks", "activity"];

  return (
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))]">
      <nav className="flex items-center gap-1 border-b border-[hsl(var(--border))] px-3 py-2">
        {tabs.map((id) => {
          const Icon = TAB_ICONS[id];
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors focus-ring",
                active
                  ? "bg-[hsl(var(--surface-2))] text-[hsl(var(--foreground))]"
                  : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-2))]/60 hover:text-[hsl(var(--foreground))]",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(id)}
            </button>
          );
        })}
      </nav>

      <div className="p-4">
        {tab === "overview" && (
          <p className="text-sm italic text-[hsl(var(--muted-foreground))]/70">
            See the panels on the right for project details.
          </p>
        )}

        {tab === "milestones" && (
          <MilestonesTab
            locale={locale}
            projectId={projectId}
            milestones={milestones}
            canManage={canManage}
          />
        )}

        {tab === "tasks" && (
          <p className="rounded-xl border border-dashed border-[hsl(var(--border-strong))] bg-[hsl(var(--surface-1))] px-4 py-8 text-center text-sm italic text-[hsl(var(--muted-foreground))]/70">
            {tDetail("tasksComingSoon")}
          </p>
        )}

        {tab === "activity" && (
          <p className="rounded-xl border border-dashed border-[hsl(var(--border-strong))] bg-[hsl(var(--surface-1))] px-4 py-8 text-center text-sm italic text-[hsl(var(--muted-foreground))]/70">
            {tDetail("activityComingSoon")}
          </p>
        )}
      </div>
    </div>
  );
}
