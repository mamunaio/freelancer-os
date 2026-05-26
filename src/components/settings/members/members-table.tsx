"use client";

import { useFormatter, useNow, useTranslations } from "next-intl";

import { MemberActions } from "./member-actions";
import { RoleBadge } from "./role-badge";
import type { MemberRow } from "@/features/members/queries";
import type { OrgRole } from "@/lib/db/models/org-member";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
  viewerRole: OrgRole;
  members: MemberRow[];
}

export function MembersTable({ locale, viewerRole, members }: Props) {
  const t = useTranslations("Members");
  const format = useFormatter();
  // useNow returns a stable Date both server and client side, so the relative
  // joined-date strings stay hydration-safe.
  const now = useNow({ updateInterval: 0 });

  if (members.length === 0) {
    return (
      <p className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] px-4 py-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
        {t("table.noResults")}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))]">
      <table className="w-full text-sm">
        <thead className="bg-[hsl(var(--surface-2))] text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
          <tr>
            <th className="px-4 py-2.5 text-left font-semibold">
              {t("table.name")}
            </th>
            <th className="px-4 py-2.5 text-left font-semibold">
              {t("table.role")}
            </th>
            <th className="px-4 py-2.5 text-left font-semibold">
              {t("table.joined")}
            </th>
            <th className="w-10 px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {members.map((m, i) => (
            <tr
              key={m.id}
              className={
                i === members.length - 1
                  ? ""
                  : "border-b border-[hsl(var(--border))]"
              }
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={m.name ?? m.email} image={m.image} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm">
                      {m.name ?? m.email}
                      {m.isYou && (
                        <span className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                          {t("table.you")}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[11px] text-[hsl(var(--muted-foreground))]">
                      {m.email}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <RoleBadge role={m.role} />
              </td>
              <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                <span title={format.dateTime(new Date(m.joinedAt), "long")}>
                  {format.relativeTime(new Date(m.joinedAt), now)}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <MemberActions
                  locale={locale}
                  viewerRole={viewerRole}
                  member={m}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Avatar({ name, image }: { name: string; image: string | null }) {
  const initials = name
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "·";

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-primary)] text-[11px] font-semibold text-[hsl(var(--primary-foreground))]">
      {initials}
    </span>
  );
}
