"use client";

import { useTranslations, useFormatter } from "next-intl";

import { Money } from "@/components/money/money";
import { Link } from "@/i18n/navigation";
import { StageBadge } from "./stage-badge";
import type { LeadRow } from "@/features/leads/queries";

interface Props {
  leads: LeadRow[];
  onEdit: (lead: LeadRow) => void;
}

/**
 * Plain table view for users who prefer dense scanning over the kanban.
 */
export function LeadsListView({ leads, onEdit }: Props) {
  const t = useTranslations("Leads");
  const tCard = useTranslations("Leads.card");
  const format = useFormatter();

  return (
    <div className="overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))]">
      <table className="w-full text-sm">
        <thead className="bg-[hsl(var(--surface-2))] text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
          <tr>
            <th className="px-4 py-2.5 text-left font-semibold">
              {t("form.name")}
            </th>
            <th className="px-4 py-2.5 text-left font-semibold">
              {t("form.stage")}
            </th>
            <th className="px-4 py-2.5 text-left font-semibold">
              {t("form.estimatedValue")}
            </th>
            <th className="px-4 py-2.5 text-left font-semibold">
              {t("form.owner")}
            </th>
            <th className="px-4 py-2.5 text-left font-semibold">
              {t("form.nextActionAt")}
            </th>
            <th className="w-10 px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {leads.map((lead, i) => (
            <tr
              key={lead.id}
              className={
                i === leads.length - 1
                  ? ""
                  : "border-b border-[hsl(var(--border))]"
              }
            >
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onEdit(lead)}
                  className="text-left hover:text-[hsl(var(--primary))] focus-ring"
                >
                  <p className="font-medium">{lead.name}</p>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    {lead.company || "Independent"}
                  </p>
                </button>
              </td>
              <td className="px-4 py-3">
                <StageBadge stage={lead.stage} size="xs" />
              </td>
              <td className="px-4 py-3 tabular-nums">
                {lead.estimatedAmount > 0 ? (
                  <Money
                    amount={lead.estimatedAmount}
                    currency={lead.estimatedCurrency}
                    amountUsd={lead.estimatedAmountUsd}
                    rateDate={lead.estimatedRateDate ?? undefined}
                    compact
                  />
                ) : (
                  <span className="text-[11px] italic text-[hsl(var(--muted-foreground))]/70">
                    —
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                {lead.owner?.name ?? lead.owner?.email ?? tCard("noOwner")}
              </td>
              <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">
                {lead.nextActionAt ? (
                  format.dateTime(new Date(lead.nextActionAt), {
                    month: "short",
                    day: "numeric",
                  })
                ) : (
                  <span className="italic opacity-60">—</span>
                )}
                {lead.nextActionNote && (
                  <p className="truncate text-[11px] opacity-70">
                    {lead.nextActionNote}
                  </p>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {lead.convertedClientId && (
                  <Link
                    href={`/clients/${lead.convertedClientId}`}
                    className="text-[11px] font-medium text-[hsl(var(--success))] hover:underline"
                  >
                    {tCard("convertedTo")}
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
