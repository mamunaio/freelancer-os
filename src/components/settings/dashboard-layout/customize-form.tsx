"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { saveDashboardLayoutAction } from "@/features/dashboard-layout/actions";
import {
  type DashboardSectionId,
  type UserSectionState,
} from "@/lib/dashboard/sections";
import type { Locale } from "@/i18n/routing";

import { SectionRow } from "./section-row";

interface CatalogEntry {
  id: DashboardSectionId;
  locked: boolean;
}

interface Props {
  locale: Locale;
  /** Initial sections (already reconciled with the catalog server-side). */
  initial: UserSectionState[];
  /** Default layout for the user's role — used by the reset button. */
  defaultLayout: UserSectionState[];
  /** Catalog metadata for the sections the viewer can see. */
  catalog: CatalogEntry[];
}

/**
 * Drag-to-reorder + visibility toggles for the dashboard layout.
 *
 * The form is *dirty* whenever the current order/visibility differs from the
 * initial server-rendered state. Saving sends the full ordered list — the
 * server reconciles it, so missing entries get appended automatically.
 */
export function CustomizeForm({
  locale,
  initial,
  defaultLayout,
  catalog,
}: Props) {
  const t = useTranslations("DashboardCustomize");
  const tSection = useTranslations("DashboardCustomize.section");
  const router = useRouter();

  const [sections, setSections] = useState<UserSectionState[]>(initial);
  const [isPending, startTransition] = useTransition();

  const lockedById = useMemo(() => {
    const map = new Map<DashboardSectionId, boolean>();
    for (const c of catalog) map.set(c.id, c.locked);
    return map;
  }, [catalog]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = sections.findIndex((s) => s.id === active.id);
    const to = sections.findIndex((s) => s.id === over.id);
    if (from < 0 || to < 0) return;
    setSections((prev) => arrayMove(prev, from, to));
  }

  function toggleVisibility(id: DashboardSectionId) {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)),
    );
  }

  function resetToDefault() {
    setSections(defaultLayout);
  }

  const dirty = useMemo(() => {
    if (sections.length !== initial.length) return true;
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].id !== initial[i].id) return true;
      if (sections[i].visible !== initial[i].visible) return true;
    }
    return false;
  }, [sections, initial]);

  function onSave() {
    if (!dirty) {
      toast.info(t("noChanges"));
      return;
    }
    startTransition(async () => {
      const result = await saveDashboardLayoutAction(
        { sections },
        locale,
      );
      if (!result.ok) {
        toast.error(result.error || t("saveFailed"));
        return;
      }
      toast.success(t("saved"));
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="font-display text-2xl font-bold tracking-tight">
          {t("title")}
        </h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {t("subtitle")}
        </p>
        <p className="text-[11px] text-[hsl(var(--muted-foreground))]/80">
          {t("lockedHint")}
        </p>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {sections.map((s) => {
              const locked = lockedById.get(s.id) ?? false;
              return (
                <SectionRow
                  key={s.id}
                  id={s.id}
                  label={tSection(s.id as DashboardSectionId)}
                  description={tSection(`${s.id}Hint` as never)}
                  visible={s.visible}
                  locked={locked}
                  showLabel={t("show")}
                  hideLabel={t("hide")}
                  dragLabel={t("drag")}
                  lockedLabel={t("locked")}
                  onToggle={() => toggleVisibility(s.id)}
                />
              );
            })}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="flex items-center justify-between gap-3 border-t border-[hsl(var(--border))] pt-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] px-3 text-xs font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--foreground))] focus-ring"
            >
              <RefreshCw className="h-3 w-3" />
              {t("reset")}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("resetConfirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("resetConfirmBody")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("noChanges")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  resetToDefault();
                }}
              >
                {t("resetAction")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || isPending}
          className="flex h-10 items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-5 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-glow)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t("save")}
        </button>
      </div>
    </div>
  );
}
