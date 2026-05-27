"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Compass, Plus } from "lucide-react";

import { LeadFormDialog } from "./lead-form-dialog";
import { LeadsKanban } from "./leads-kanban";
import { LeadsListView } from "./leads-list-view";
import {
  LeadsToolbar,
  type LeadFilterState,
} from "./leads-toolbar";
import { EmptyState } from "@/components/layout/empty-state";
import type { LeadStage } from "@/features/leads/constants";
import type { LeadRow } from "@/features/leads/queries";
import type { Locale } from "@/i18n/routing";

interface MemberOption {
  id: string;
  name: string;
}

interface Props {
  locale: Locale;
  initialLeads: LeadRow[];
  members: MemberOption[];
  canManage: boolean;
}

const UNASSIGNED = "unassigned";

/**
 * Top-level client orchestrator for the leads page. Owns:
 *  - filters + view toggle (kanban / list)
 *  - dialog state for create + edit
 */
export function LeadsOrchestrator({
  locale,
  initialLeads,
  members,
  canManage,
}: Props) {
  const t = useTranslations("Leads");

  const [filters, setFilters] = useState<LeadFilterState>({
    search: "",
    stage: "any",
    ownerId: "any",
    source: "any",
  });
  const deferred = useDeferredValue(filters);

  const [view, setView] = useState<"kanban" | "list">("list");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadRow | null>(null);
  const [defaultStage, setDefaultStage] = useState<LeadStage | undefined>();

  const visible = useMemo(
    () => applyFilters(initialLeads, deferred),
    [initialLeads, deferred],
  );

  function openCreate(stage?: LeadStage) {
    setEditingLead(null);
    setDefaultStage(stage);
    setDialogOpen(true);
  }

  function openEdit(lead: LeadRow) {
    setEditingLead(lead);
    setDefaultStage(undefined);
    setDialogOpen(true);
  }

  const hasAny = initialLeads.length > 0;
  const hasResults = visible.length > 0;

  return (
    <div className="space-y-5">
      {hasAny && (
        <LeadsToolbar
          filters={filters}
          onFiltersChange={setFilters}
          members={members}
          view={view}
          onViewChange={setView}
        />
      )}

      {!hasAny ? (
        <EmptyState
          icon={Compass}
          title={t("empty.title")}
          description={t("empty.subtitle")}
          action={
            canManage ? (
              <button
                type="button"
                onClick={() => openCreate()}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-glow)] hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("empty.cta")}
              </button>
            ) : undefined
          }
        />
      ) : !hasResults ? (
        <EmptyState
          icon={Compass}
          variant="filtered"
          title={t("filtered.title")}
          description={t("filtered.subtitle")}
        />
      ) : view === "kanban" ? (
        <LeadsKanban
          locale={locale}
          leads={visible}
          members={members}
          onAdd={openCreate}
          onEdit={openEdit}
        />
      ) : (
        <LeadsListView locale={locale} leads={visible} onEdit={openEdit} />
      )}

      {canManage && (
        <LeadFormDialog
          locale={locale}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          lead={editingLead}
          defaultStage={defaultStage}
          members={members}
        />
      )}
    </div>
  );
}

function applyFilters(rows: LeadRow[], filters: LeadFilterState): LeadRow[] {
  let out = rows;

  if (filters.stage !== "any") {
    out = out.filter((l) => l.stage === filters.stage);
  }

  if (filters.ownerId === UNASSIGNED) {
    out = out.filter((l) => !l.owner);
  } else if (filters.ownerId !== "any") {
    out = out.filter((l) => l.owner?.id === filters.ownerId);
  }

  if (filters.source !== "any") {
    out = out.filter((l) => l.source === filters.source);
  }

  if (filters.search.trim()) {
    const needle = filters.search.trim().toLowerCase();
    out = out.filter(
      (l) =>
        l.name.toLowerCase().includes(needle) ||
        (l.company ?? "").toLowerCase().includes(needle) ||
        (l.email ?? "").toLowerCase().includes(needle),
    );
  }

  return out;
}
