import { useTranslations } from "next-intl";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskPriority } from "@/features/tasks/constants";

const STYLES: Record<
  TaskPriority,
  { cls: string; icon: React.ComponentType<{ className?: string }> }
> = {
  high: {
    cls: "border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]",
    icon: ArrowUp,
  },
  medium: {
    cls: "border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
    icon: ArrowRight,
  },
  low: {
    cls: "border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] text-[hsl(var(--muted-foreground))]",
    icon: ArrowDown,
  },
};

export function PriorityBadge({
  priority,
  size = "xs",
}: {
  priority: TaskPriority;
  size?: "xs" | "sm";
}) {
  const t = useTranslations("Tasks.priority");
  const config = STYLES[priority];
  const Icon = config.icon;
  const small = size === "xs";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded border font-semibold uppercase tracking-[0.16em]",
        small ? "h-4 px-1 text-[9px]" : "h-5 px-1.5 text-[10px]",
        config.cls,
      )}
    >
      <Icon className={small ? "h-2 w-2" : "h-2.5 w-2.5"} />
      {t(priority)}
    </span>
  );
}
