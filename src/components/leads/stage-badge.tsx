import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { LeadStage } from "@/features/leads/constants";

const STYLES: Record<LeadStage, string> = {
  new: "border-[hsl(var(--info))]/30 bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]",
  contacted:
    "border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]",
  proposal:
    "border-[hsl(var(--accent))]/30 bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]",
  negotiation:
    "border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
  won: "border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  lost: "border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] text-[hsl(var(--muted-foreground))]",
};

export function StageBadge({
  stage,
  size = "sm",
}: {
  stage: LeadStage;
  size?: "sm" | "xs";
}) {
  const t = useTranslations("Leads.stage");
  const small = size === "xs";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-semibold uppercase tracking-[0.16em]",
        small ? "h-5 px-1.5 text-[9px]" : "h-6 px-2 text-[10px]",
        STYLES[stage],
      )}
    >
      {t(stage)}
    </span>
  );
}
