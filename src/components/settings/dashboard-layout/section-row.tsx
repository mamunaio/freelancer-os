"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical, Lock } from "lucide-react";

import { cn } from "@/lib/utils";

interface Props {
  id: string;
  label: string;
  description: string;
  visible: boolean;
  locked: boolean;
  /** Translated tooltip strings — kept on the row so the parent doesn't have to thread them. */
  showLabel: string;
  hideLabel: string;
  dragLabel: string;
  lockedLabel: string;
  onToggle: () => void;
}

/**
 * Single sortable section row. Drag handle on the left, label + helper in
 * the middle, eye toggle on the right (or a lock chip for the anchor).
 */
export function SectionRow({
  id,
  label,
  description,
  visible,
  locked,
  showLabel,
  hideLabel,
  dragLabel,
  lockedLabel,
  onToggle,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] px-3 py-2.5 transition-colors",
        isDragging && "z-10 shadow-[var(--shadow-elegant)]",
        !visible && "opacity-60",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex h-7 w-6 shrink-0 cursor-grab items-center justify-center rounded text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--foreground))] focus-ring active:cursor-grabbing"
        title={dragLabel}
        aria-label={dragLabel}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          {label}
          {locked && (
            <span className="inline-flex items-center gap-1 rounded border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              <Lock className="h-2.5 w-2.5" />
              {lockedLabel}
            </span>
          )}
        </p>
        <p className="text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]">
          {description}
        </p>
      </div>

      {locked ? (
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center text-[hsl(var(--muted-foreground))]"
          aria-hidden="true"
        >
          <Lock className="h-3.5 w-3.5" />
        </span>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded transition-colors focus-ring",
            visible
              ? "text-[hsl(var(--foreground))]/80 hover:bg-[hsl(var(--surface-2))]"
              : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--foreground))]",
          )}
          title={visible ? hideLabel : showLabel}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
        >
          {visible ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </li>
  );
}
