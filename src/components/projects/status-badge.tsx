import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/features/projects/constants";

const STYLES: Record<ProjectStatus, string> = {
  planning:
    "border-[hsl(var(--info))]/30 bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]",
  in_progress:
    "border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]",
  review:
    "border-[hsl(var(--accent))]/30 bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]",
  on_hold:
    "border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
  completed:
    "border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  archived:
    "border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] text-[hsl(var(--muted-foreground))]",
};

export function ProjectStatusBadge({
  status,
  size = "sm",
}: {
  status: ProjectStatus;
  size?: "sm" | "xs";
}) {
  const t = useTranslations("Projects.status");
  const small = size === "xs";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-semibold uppercase tracking-[0.16em]",
        small ? "h-5 px-1.5 text-[9px]" : "h-6 px-2 text-[10px]",
        STYLES[status],
      )}
    >
      {t(status)}
    </span>
  );
}
