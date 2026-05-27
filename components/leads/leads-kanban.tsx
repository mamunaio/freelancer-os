"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  rectIntersection,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";

import { changeLeadStageAction } from "@/features/leads/actions";
import {
  KANBAN_STAGES,
  type LeadStage,
} from "@/features/leads/constants";
import { LeadCard } from "./lead-card";
import { Money } from "@/components/money/money";
import { cn } from "@/lib/utils";
import type { LeadRow } from "@/features/leads/queries";
import type { Locale } from "@/i18n/routing";

interface MemberOption {
  id: string;
  name: string;
}

interface Props {
  locale: Locale;
  leads: LeadRow[];
  members: MemberOption[];
  onAdd: (stage: LeadStage) => void;
  onEdit: (lead: LeadRow) => void;
}

const COLUMN_TINT: Record<LeadStage, string> = {
  new: "border-[hsl(var(--info))]/25 bg-[hsl(var(--info))]/5",
  contacted: "border-[hsl(var(--primary))]/25 bg-[hsl(var(--primary))]/5",
  proposal: "border-[hsl(var(--accent))]/25 bg-[hsl(var(--accent))]/5",
  negotiation: "border-[hsl(var(--warning))]/25 bg-[hsl(var(--warning))]/5",
  won: "border-[hsl(var(--success))]/25 bg-[hsl(var(--success))]/5",
  lost: "border-[hsl(var(--border))] bg-[hsl(var(--surface-1))]/40",
};

/**
 * Drag-and-drop kanban board for leads.
 *
 * Optimistic update: dropping a card flips its stage in local state
 * immediately so the move feels instant; the server action validates and
 * persists in the background. On failure we toast the error and refresh.
 */
export function LeadsKanban({ locale, leads, members: _members, onAdd, onEdit }: Props) {
  const t = useTranslations("Leads");
  const tStage = useTranslations("Leads.stage");
  const tKanban = useTranslations("Leads.kanban");
  const router = useRouter();

  // Local mirror so drops feel snappy without waiting on the server.
  const [items, setItems] = useState(leads);
  const [_isPending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);

  // Re-sync if the parent list changes (server refresh).
  // useEffect would also work; setState in render is safe here because the
  // derived guard is cheap and reverts to the source list every render.
  if (leads !== prevLeads.current) {
    prevLeads.current = leads;
    if (leads.map((l) => l.id + l.stage).join() !==
        items.map((l) => l.id + l.stage).join()) {
      setItems(leads);
    }
  }

  const grouped = useMemo(() => {
    const map: Record<LeadStage, LeadRow[]> = {
      new: [],
      contacted: [],
      proposal: [],
      negotiation: [],
      won: [],
      lost: [],
    };
    for (const lead of items) map[lead.stage].push(lead);
    return map;
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const fromLead = items.find((l) => l.id === activeIdStr);
    if (!fromLead) return;

    // The droppable id matches the column stage when dropped on empty space;
    // otherwise it's another lead id, in which case we look up that lead's
    // stage.
    let targetStage: LeadStage | null = null;
    if (KANBAN_STAGES.includes(overIdStr as LeadStage)) {
      targetStage = overIdStr as LeadStage;
    } else {
      const overLead = items.find((l) => l.id === overIdStr);
      if (overLead) targetStage = overLead.stage;
    }
    if (!targetStage || targetStage === fromLead.stage) return;

    // Optimistic update.
    setItems((prev) =>
      prev.map((l) =>
        l.id === activeIdStr ? { ...l, stage: targetStage as LeadStage } : l,
      ),
    );

    startTransition(async () => {
      const result = await changeLeadStageAction(
        { id: activeIdStr, stage: targetStage as LeadStage },
        locale,
      );
      if (!result.ok) {
        toast.error(result.error);
        // Roll back by re-pulling from server.
        router.refresh();
        return;
      }
      router.refresh();
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin">
        {KANBAN_STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            label={tStage(stage)}
            leads={grouped[stage]}
            tint={COLUMN_TINT[stage]}
            emptyLabel={tKanban("empty")}
            addLabel={tKanban("addCard")}
            onAdd={() => onAdd(stage)}
            renderCard={(lead) => (
              <DraggableLeadCard
                lead={lead}
                locale={locale}
                onEdit={() => onEdit(lead)}
                isActive={activeId === lead.id}
              />
            )}
          />
        ))}
      </div>
    </DndContext>
  );
}

// Module-level ref so we can compare incoming `leads` to the last seen
// snapshot without triggering useEffect dependencies.
const prevLeads = { current: [] as LeadRow[] };

// ────────────────────────────────────────────────────────────
// Column
// ────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  label,
  leads,
  tint,
  emptyLabel,
  addLabel,
  onAdd,
  renderCard,
}: {
  stage: LeadStage;
  label: string;
  leads: LeadRow[];
  tint: string;
  emptyLabel: string;
  addLabel: string;
  onAdd: () => void;
  renderCard: (lead: LeadRow) => React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  // Sum of estimated values for this column.
  const total = leads.reduce((acc, l) => acc + l.estimatedAmountUsd, 0);

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex w-80 min-w-[320px] max-w-[320px] shrink-0 flex-col rounded-2xl border p-3 backdrop-blur-md transition-all duration-200 min-h-[70vh] bg-[hsl(var(--surface-1))]/20 shadow-[0_4px_24px_rgba(0,0,0,0.06)]",
        tint,
        isOver && "ring-2 ring-[hsl(var(--primary))]/30 border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/5",
      )}
    >
      <header className="sticky top-0 z-10 mb-3 flex items-center justify-between rounded-xl border border-[hsl(var(--border))]/40 bg-[hsl(var(--surface-1))]/90 p-2.5 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--foreground))]">
            {label}
          </h3>
          <span className="rounded-full bg-[hsl(var(--primary))]/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-[hsl(var(--primary))]">
            {leads.length}
          </span>
        </div>
        {total > 0 && (
          <span className="text-[10px] font-bold tabular-nums text-[hsl(var(--muted-foreground))]">
            <Money amount={total} currency="USD" compact noTooltip />
          </span>
        )}
      </header>

      <SortableContext
        items={leads.map((l) => l.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className={cn(
          "flex min-h-[500px] flex-col gap-2.5 rounded-xl p-1 transition-all duration-200",
          isOver && "bg-[hsl(var(--primary))]/5 border-2 border-dashed border-[hsl(var(--primary))]/20"
        )}>
          {leads.map((lead) => (
            <div key={lead.id} className="transition-transform duration-200 hover:-translate-y-[1px]">{renderCard(lead)}</div>
          ))}
          {leads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-dashed border-[hsl(var(--border))]/50 bg-[hsl(var(--surface-1))]/10">
              <p className="text-center text-[11px] italic text-[hsl(var(--muted-foreground))]/60">
                {emptyLabel}
              </p>
            </div>
          )}
        </div>
      </SortableContext>

      <button
        type="button"
        onClick={onAdd}
        className="mt-3 flex h-9 items-center justify-center gap-1.5 rounded-xl border border-dashed border-[hsl(var(--border))]/65 text-[11px] font-semibold text-[hsl(var(--muted-foreground))] transition-all hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--foreground))] focus-ring"
      >
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </button>
    </section>
  );
}

// ────────────────────────────────────────────────────────────
// Sortable card wrapper
// ────────────────────────────────────────────────────────────

function DraggableLeadCard({
  lead,
  locale,
  onEdit,
  isActive,
}: {
  lead: LeadRow;
  locale: Locale;
  onEdit: () => void;
  isActive: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isActive && isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <LeadCard
        lead={lead}
        locale={locale}
        onEdit={onEdit}
        dragHandleProps={{
          attributes: attributes as unknown as Record<string, unknown>,
          listeners: (listeners ?? undefined) as unknown as
            | Record<string, unknown>
            | undefined,
          isDragging,
        }}
      />
    </div>
  );
}
