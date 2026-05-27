"use client";

import { useTranslations } from "next-intl";
import { Target, Play, Bell, Calendar as CalIcon, MessageSquare, Plus, Search } from "lucide-react";
import { type MyWorkData } from "../demo-data";
import { ClickupTaskGroup } from "./clickup-task-group";
import { ClickupTaskRow } from "./clickup-task-row";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CommandPalette } from "@/components/layout/command-palette";
import { DeepWorkModal } from "@/components/layout/deep-work-modal";

export function MyWorkLayout({ data }: { data: MyWorkData }) {
  const t = useTranslations("MyWork");
  const [activeTab, setActiveTab] = useState("my-work");
  const [cmdOpen, setCmdOpen] = useState(false);
  const [deepWorkOpen, setDeepWorkOpen] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      
      {/* 1. ClickUp Style Top Navigation Tabs */}
      <header className="flex flex-col gap-4 border-b border-[hsl(var(--border))]/50 pb-0">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
              <Target className="h-5 w-5" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
              {t("title")}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
              <input 
                type="text" 
                placeholder={t("searchPlaceholder")}
                className="h-9 w-64 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] pl-9 pr-3 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
              />
            </div>
            <button 
              onClick={() => setCmdOpen(true)}
              className="flex h-9 items-center gap-2 rounded-md bg-[hsl(var(--primary))] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              {t("newTask")}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 px-2 text-sm font-medium">
          {[
            { id: "my-work", label: "My Work" },
            { id: "lineup", label: "Lineup" },
            { id: "calendar", label: "Calendar" },
            { id: "mentions", label: "Mentions" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative pb-3 text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]",
                activeTab === tab.id && "text-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 h-0.5 w-full rounded-t-full bg-[hsl(var(--primary))]" />
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row mt-2">
        
        {/* Main Column */}
        <div className="flex-1 space-y-6">
          
          {activeTab === "my-work" && (
            <>
              {/* Lineup / Focus Widget */}
              {data.focusTask && (
                <section className="mb-8">
                  <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] px-2">
                    {t("myLineup")}
                  </h3>
                  <div className="relative overflow-hidden rounded-xl border border-[hsl(var(--border))]/80 bg-gradient-to-r from-[hsl(var(--surface-1))] to-[hsl(var(--surface-2))] p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex gap-4">
                        <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20 text-[hsl(var(--primary))]">
                          <Target className="h-6 w-6" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold leading-tight text-[hsl(var(--foreground))]">
                            {data.focusTask.title}
                          </h2>
                          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                            {data.focusTask.client} · {data.focusTask.project}
                          </p>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => setDeepWorkOpen(true)}
                        className="group flex h-10 items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 font-medium text-white shadow-sm transition-all hover:bg-[hsl(var(--primary))]/90 active:scale-95"
                      >
                        <Play className="h-4 w-4" />
                        <span className="text-sm">{t("startTimer")}</span>
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* Collapsible Tabular Groups */}
              <div className="space-y-4">
                <ClickupTaskGroup 
                  title={t("overdue")} 
                  color="text-red-500" 
                  tasks={data.overdue} 
                />
                <ClickupTaskGroup 
                  title={t("today")} 
                  color="text-[hsl(var(--foreground))]" 
                  tasks={data.today} 
                />
                <ClickupTaskGroup 
                  title={t("next")} 
                  color="text-[hsl(var(--muted-foreground))]" 
                  tasks={data.upcoming} 
                  defaultOpen={false} 
                />
              </div>
            </>
          )}

          {activeTab === "lineup" && (
            <div className="space-y-4">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] px-2">
                {t("activeLineup")}
              </h3>
              {data.lineup.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--surface-1))]/50 text-[hsl(var(--muted-foreground))] p-6 text-center">
                  <Target className="mb-4 h-8 w-8 text-[hsl(var(--primary))]/50 animate-pulse" />
                  <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{t("emptyLineupTitle")}</p>
                  <p className="text-xs max-w-sm mt-1">
                    {t("emptyLineupDesc")}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] shadow-sm">
                  {/* Table Header */}
                  <div className="grid grid-cols-[1fr_120px_100px_120px_80px_40px] gap-4 border-b border-[hsl(var(--border))]/60 bg-[hsl(var(--surface-1))]/50 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))] rounded-t-xl">
                    <div>Task Name</div>
                    <div>Status</div>
                    <div>Assignee</div>
                    <div>Due Date</div>
                    <div className="text-center">Priority</div>
                    <div></div>
                  </div>
                  {/* Table Rows */}
                  <div className="flex flex-col">
                    {data.lineup.map((task, idx) => (
                      <ClickupTaskRow key={task.id} task={task} isLast={idx === data.lineup.length - 1} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "calendar" && (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--surface-1))]/50 text-[hsl(var(--muted-foreground))]">
              <CalIcon className="mb-4 h-8 w-8 text-[hsl(var(--primary))]/50" />
              <p className="text-sm font-medium">{t("calendarView")}</p>
              <p className="text-xs">{t("comingSoon")}</p>
            </div>
          )}

          {activeTab === "mentions" && (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--surface-1))]/50 text-[hsl(var(--muted-foreground))]">
              <MessageSquare className="mb-4 h-8 w-8 text-[hsl(var(--primary))]/50" />
              <p className="text-sm font-medium">{t("mentionsView")}</p>
              <p className="text-xs">{t("comingSoon")}</p>
            </div>
          )}

        </div>

        {/* Right Sidebar (Activity) */}
        <aside className="w-full lg:w-80 shrink-0 space-y-6">
          <div className="rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--surface-1))]/30 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-2">
                <Bell className="h-3.5 w-3.5" />
                {t("inbox")}
              </h3>
              <button className="text-[10px] font-medium text-[hsl(var(--primary))] hover:underline">{t("markAllRead")}</button>
            </div>
            
            <div className="space-y-4">
              {data.activity.map((act) => (
                <div key={act.id} className="group flex gap-3 rounded-lg p-2 transition-colors hover:bg-[hsl(var(--surface-2))]">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary))]/10 text-[11px] font-bold text-[hsl(var(--primary))]">
                    {act.user.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] leading-tight">
                      <span className="font-semibold text-[hsl(var(--foreground))]">{act.user}</span>{" "}
                      <span className="text-[hsl(var(--muted-foreground))]">{act.action}</span>{" "}
                      <span className="font-medium text-[hsl(var(--foreground))]">{act.target}</span>
                    </p>
                    <p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{act.timeAgo}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

      </div>

      {/* Global Command Palette and Focus Session triggers */}
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      <DeepWorkModal open={deepWorkOpen} onOpenChange={setDeepWorkOpen} />
    </div>
  );
}
