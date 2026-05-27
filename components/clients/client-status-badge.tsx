import { useTranslations } from "next-intl";
import { CircleDashed, Pause, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientStatus } from "@/features/clients/constants";

const STYLES: Record<
  ClientStatus,
  {
    cls: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  active: {
    cls: "border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
    icon: CircleDashed,
  },
  paused: {
    cls: "border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
    icon: Pause,
  },
  archived: {
    cls: "border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] text-[hsl(var(--muted-foreground))]",
    icon: Archive,
  },
};

export function ClientStatusBadge({
  status,
  size = "sm",
}: {
  status: ClientStatus;
  size?: "sm" | "xs";
}) {
  const t = useTranslations("Clients.status");
  const config = STYLES[status];
  const Icon = config.icon;
  const small = size === "xs";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-semibold uppercase tracking-[0.16em]",
        small ? "h-5 px-1.5 text-[9px]" : "h-6 px-2 text-[10px]",
        config.cls,
      )}
    >
      <Icon className={small ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {t(status)}
    </span>
  );
}
