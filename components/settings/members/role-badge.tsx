import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { OrgRole } from "@/lib/db/models/org-member";

const styles: Record<OrgRole, string> = {
  owner:
    "border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/12 text-[hsl(var(--primary))]",
  admin:
    "border-[hsl(var(--accent))]/40 bg-[hsl(var(--accent))]/12 text-[hsl(var(--accent))]",
  manager:
    "border-[hsl(var(--info))]/40 bg-[hsl(var(--info))]/12 text-[hsl(var(--info))]",
  member:
    "border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] text-[hsl(var(--muted-foreground))]",
};

export function RoleBadge({ role }: { role: OrgRole }) {
  const t = useTranslations("Members.role");
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md border px-2 text-[10px] font-semibold uppercase tracking-[0.16em]",
        styles[role],
      )}
    >
      {t(role)}
    </span>
  );
}
