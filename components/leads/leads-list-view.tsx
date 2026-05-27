"use client";

import { useState, useTransition } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Trash2,
  CheckCircle,
  Building2,
  ChevronDown,
  UserCircle2,
  Calendar,
  Layers,
} from "lucide-react";

import { Money } from "@/components/money/money";
import { Link } from "@/i18n/navigation";
import { KANBAN_STAGES, type LeadStage } from "@/features/leads/constants";
import { changeLeadStageAction, deleteLeadAction } from "@/features/leads/actions";
import { useRouter } from "next/navigation";
import type { LeadRow } from "@/features/leads/queries";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

interface Props {
  locale: Locale;
  leads: LeadRow[];
  onEdit: (lead: LeadRow) => void;
}

const STAGE_COLORS: Record<LeadStage, { bg: string; text: string; dot: string }> = {
  new: { bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-400" },
  contacted: { bg: "bg-indigo-500/10", text: "text-indigo-400", dot: "bg-indigo-400" },
  proposal: { bg: "bg-purple-500/10", text: "text-purple-400", dot: "bg-purple-400" },
  negotiation: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400" },
  won: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  lost: { bg: "bg-rose-500/10", text: "text-rose-400", dot: "bg-rose-400" },
};

export function LeadsListView({ locale, leads, onEdit }: Props) {
  const t = useTranslations("Leads");
  const tCard = useTranslations("Leads.card");
  const tActions = useTranslations("Leads.actions");
  const format = useFormatter();
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleStageChange = (leadId: string, nextStage: LeadStage) => {
    setActiveDropdownId(null);
    startTransition(async () => {
      const result = await changeLeadStageAction({ id: leadId, stage: nextStage }, locale);
      if (!result.ok) {
        toast.error(result.error || "Failed to update stage");
        return;
      }
      toast.success("Stage updated successfully");
      router.refresh();
    });
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} selected leads?`)) {
      startTransition(async () => {
        let successCount = 0;
        for (const id of Array.from(selectedIds)) {
          const res = await deleteLeadAction(id, locale);
          if (res.ok) successCount++;
        }
        toast.success(`Successfully deleted ${successCount} leads`);
        setSelectedIds(new Set());
        router.refresh();
      });
    }
  };

  const allSelected = leads.length > 0 && selectedIds.size === leads.length;
  const isAnySelected = selectedIds.size > 0;

  return (
    <div className="relative">
      <div className="overflow-x-auto pb-4 scrollbar-thin">
        <div className="min-w-[1000px] overflow-hidden rounded-2xl border border-[hsl(var(--border))]/40 bg-[hsl(var(--surface-1))]/25 shadow-[0_8px_32px_rgba(0,0,0,0.04)] backdrop-blur-md">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]/40 bg-[hsl(var(--surface-2))]/60 text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))] backdrop-blur-md">
                <th className="w-12 px-4 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-[hsl(var(--border))]/85 bg-transparent accent-[hsl(var(--primary))]"
                  />
                </th>
                <th className="px-5 py-3.5 text-left">{t("form.name")}</th>
                <th className="px-5 py-3.5 text-left">{t("form.stage")}</th>
                <th className="px-5 py-3.5 text-left">{t("form.estimatedValue")}</th>
                <th className="px-5 py-3.5 text-left">{t("form.owner")}</th>
                <th className="px-5 py-3.5 text-left">{t("form.nextActionAt")}</th>
                <th className="w-14 px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]/30">
              {leads.map((lead) => {
                const isSelected = selectedIds.has(lead.id);
                const colors = STAGE_COLORS[lead.stage] || STAGE_COLORS.new;

                return (
                  <tr
                    key={lead.id}
                    className={cn(
                      "group transition-all duration-150 hover:bg-[hsl(var(--surface-1))]/80",
                      isSelected && "bg-[hsl(var(--primary))]/5 hover:bg-[hsl(var(--primary))]/10"
                    )}
                  >
                    {/* Row Checkbox */}
                    <td className="px-4 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectRow(lead.id, e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-[hsl(var(--border))]/85 bg-transparent accent-[hsl(var(--primary))]"
                      />
                    </td>

                    {/* Name & Company */}
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => onEdit(lead)}
                        className="text-left group/btn focus:outline-none"
                      >
                        <p className="font-semibold text-[hsl(var(--foreground))] transition-colors group-hover/btn:text-[hsl(var(--primary))]">
                          {lead.name}
                        </p>
                        <p className="flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                          <Building2 className="h-3 w-3 shrink-0" />
                          {lead.company || "Independent"}
                        </p>
                      </button>
                    </td>

                    {/* Stage & Inline Stage Editor */}
                    <td className="px-5 py-3.5 relative">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdownId(activeDropdownId === lead.id ? null : lead.id);
                          }}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-none transition-all duration-150 hover:scale-105 active:scale-95",
                            colors.bg,
                            colors.text
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", colors.dot)} />
                          {t(`stage.${lead.stage}`)}
                          <ChevronDown className="h-3 w-3 opacity-60" />
                        </button>

                        <AnimatePresence>
                          {activeDropdownId === lead.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setActiveDropdownId(null)}
                              />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute left-0 mt-1.5 z-20 w-44 rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--surface-1))] p-1 shadow-lg backdrop-blur-md"
                              >
                                {KANBAN_STAGES.map((s) => {
                                  const sColors = STAGE_COLORS[s];
                                  return (
                                    <button
                                      key={s}
                                      onClick={() => handleStageChange(lead.id, s)}
                                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-2))]"
                                    >
                                      <span className={cn("h-1.5 w-1.5 rounded-full", sColors.dot)} />
                                      {t(`stage.${s}`)}
                                    </button>
                                  );
                                })}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>

                    {/* Estimated Budget */}
                    <td className="px-5 py-3.5 font-display font-semibold tabular-nums text-[hsl(var(--foreground))]">
                      {lead.estimatedAmount > 0 ? (
                        <Money
                          amount={lead.estimatedAmount}
                          currency={lead.estimatedCurrency}
                          amountUsd={lead.estimatedAmountUsd}
                          rateDate={lead.estimatedRateDate ?? undefined}
                          compact
                        />
                      ) : (
                        <span className="text-[11px] font-medium italic text-[hsl(var(--muted-foreground))]/60">
                          —
                        </span>
                      )}
                    </td>

                    {/* Lead Owner */}
                    <td className="px-5 py-3.5 text-[hsl(var(--muted-foreground))]">
                      <div className="flex items-center gap-1.5">
                        <UserCircle2 className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]/70" />
                        <span className="text-xs font-semibold">
                          {lead.owner?.name ?? lead.owner?.email ?? tCard("noOwner")}
                        </span>
                      </div>
                    </td>

                    {/* Next Follow Up Action */}
                    <td className="px-5 py-3.5 text-[hsl(var(--muted-foreground))]">
                      {lead.nextActionAt ? (
                        <div className="space-y-1">
                          <p className="flex items-center gap-1 text-xs font-semibold">
                            <Calendar className="h-3 w-3" />
                            {format.dateTime(new Date(lead.nextActionAt), {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          {lead.nextActionNote && (
                            <p className="max-w-[150px] truncate text-[11px] opacity-75">
                              {lead.nextActionNote}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="italic opacity-50">—</span>
                      )}
                    </td>

                    {/* Converted Project link */}
                    <td className="px-5 py-3.5 text-right">
                      {lead.convertedClientId && (
                        <Link
                          href={`/clients/${lead.convertedClientId}`}
                          className="inline-flex items-center gap-1 rounded border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/20 transition-all"
                        >
                          <CheckCircle className="h-2.5 w-2.5" />
                          {tCard("convertedTo")}
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Bulk Actions Bar */}
      <AnimatePresence>
        {isAnySelected && (
          <motion.div
            initial={{ y: 80, x: "-50%", opacity: 0 }}
            animate={{ y: 0, x: "-50%", opacity: 1 }}
            exit={{ y: 80, x: "-50%", opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 260 }}
            className="fixed bottom-6 left-1/2 z-50 flex items-center gap-5 rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--surface-1))]/80 px-6 py-3.5 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-2 border-r border-[hsl(var(--border))]/60 pr-4">
              <Layers className="h-4 w-4 text-[hsl(var(--primary))]" />
              <span className="text-xs font-bold text-[hsl(var(--foreground))]">
                {selectedIds.size} selected
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  toast.success(`Mass emailing initiated for ${selectedIds.size} prospects`);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[hsl(var(--primary))]/10 px-3.5 text-xs font-bold text-[hsl(var(--primary))] transition-all hover:bg-[hsl(var(--primary))]/20 active:scale-95"
              >
                <Mail className="h-3.5 w-3.5" />
                Mass Email
              </button>

              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={isPending}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-red-500/10 px-3.5 text-xs font-bold text-red-400 transition-all hover:bg-red-500/20 active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Selected
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
