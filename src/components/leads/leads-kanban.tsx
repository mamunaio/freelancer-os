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
      <div className="flex gap-3 overflow-x-auto pb-2">
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
        "flex w-72 shrink-0 flex-col rounded-xl border p-2 transition-colors",
        tint,
        isOver && "ring-2 ring-[hsl(var(--primary))]/40",
      )}
    >
      <header className="mb-2 flex items-center justify-between px-1.5 py-1">
        <div className="flex items-center gap-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em]">
            {label}
          </h3>
          <span className="rounded bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-[hsl(var(--muted-foreground))]">
            {leads.length}
          </span>
        </div>
        {total > 0 && (
          <span className="text-[10px] font-medium tabular-nums text-[hsl(var(--muted-foreground))]">
            <Money amount={total} currency="USD" compact noTooltip />
          </span>
        )}
      </header>

      <SortableContext
        items={leads.map((l) => l.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex min-h-[120px] flex-col gap-2">
          {leads.map((lead) => (
            <div key={lead.id}>{renderCard(lead)}</div>
          ))}
          {leads.length === 0 && (
            <p className="px-1.5 py-3 text-center text-[11px] italic text-[hsl(var(--muted-foreground))]/60">
              {emptyLabel}
            </p>
          )}
        </div>
      </SortableContext>

      <button
        type="button"
        onClick={onAdd}
        className="mt-2 flex h-8 items-center justify-center gap-1 rounded-md text-[11px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--foreground))] focus-ring"
      >
        <Plus className="h-3 w-3" />
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
