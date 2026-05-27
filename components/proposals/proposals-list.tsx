"use client";

import { useRouter } from "next/navigation";
import { Plus, ExternalLink, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Locale } from "@/i18n/routing";

interface ProposalRow {
  id: string;
  title: string;
  clientLabel: string | null;
  totalValue: number;
  currency: "USD" | "BDT";
  status: "draft" | "sent" | "viewed" | "accepted" | "rejected";
  validUntil: string;
  shareToken: string;
}

interface Props {
  locale: Locale;
  proposals: ProposalRow[];
  canManage: boolean;
}

/**
 * Proposals Dashboard — ultra-modern, cinematic data grid.
 *
 * Features:
 * - Glassmorphism hover effects
 * - Borderless layout with subtle shadows
 * - Beautiful status badges
 * - Premium enterprise aesthetic
 */
export function ProposalsList({ locale, proposals, canManage }: Props) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proposals</h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            Web-based proposals that close deals
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => router.push(`/${locale}/proposals/new`)}
            size="lg"
            className="gap-2 shadow-lg shadow-[hsl(var(--primary))]/20"
          >
            <Plus className="h-5 w-5" />
            Create Proposal
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total"
          value={proposals.length}
          variant="default"
        />
        <StatCard
          label="Draft"
          value={proposals.filter((p) => p.status === "draft").length}
          variant="muted"
        />
        <StatCard
          label="Sent"
          value={proposals.filter((p) => p.status === "sent").length}
          variant="info"
        />
        <StatCard
          label="Viewed"
          value={proposals.filter((p) => p.status === "viewed").length}
          variant="warning"
        />
        <StatCard
          label="Accepted"
          value={proposals.filter((p) => p.status === "accepted").length}
          variant="success"
        />
      </div>

      {/* Data Grid */}
      {proposals.length === 0 ? (
        <EmptyState locale={locale} canManage={canManage} />
      ) : (
        <div className="relative overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-[hsl(var(--surface-1))] to-[hsl(var(--surface-2))]/50 shadow-2xl shadow-black/5 backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]/50 bg-[hsl(var(--surface-2))]/30 backdrop-blur-sm">
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                    Proposal Name
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                    Client / Lead
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                    Value
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                    Valid Until
                  </th>
                  <th className="w-12 px-2 py-4">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((proposal) => (
                  <tr
                    key={proposal.id}
                    className="group cursor-pointer border-b border-[hsl(var(--border))]/30 transition-all duration-300 hover:bg-gradient-to-r hover:from-[hsl(var(--primary))]/5 hover:to-transparent hover:shadow-lg hover:shadow-[hsl(var(--primary))]/5"
                    onClick={() =>
                      router.push(`/${locale}/proposals/${proposal.id}`)
                    }
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary))]/60 shadow-lg shadow-[hsl(var(--primary))]/20">
                          <ExternalLink className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold leading-tight text-[hsl(var(--foreground))]">
                            {proposal.title}
                          </p>
                          <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                            ID: {proposal.id.slice(-8)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-medium text-[hsl(var(--foreground))]">
                        {proposal.clientLabel ?? "—"}
                      </p>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <p className="font-display text-lg font-bold tabular-nums text-[hsl(var(--foreground))]">
                        {proposal.currency === "USD" ? "$" : "৳"}
                        {proposal.totalValue.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <StatusBadge status={proposal.status} />
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {formatDate(proposal.validUntil, locale)}
                      </p>
                    </td>
                    <td
                      className="px-2 py-5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] opacity-0 transition-all hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--foreground))] group-hover:opacity-100"
                            >
                              <MoreHorizontal className="h-5 w-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/${locale}/proposals/${proposal.id}`)
                              }
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            {proposal.status === "draft" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(`/${locale}/proposals/${proposal.id}`)
                                }
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() =>
                                window.open(
                                  `/${locale}/portal/${proposal.shareToken}/proposal`,
                                  "_blank",
                                )
                              }
                            >
                              <ExternalLink className="h-4 w-4" />
                              Open Public Link
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive">
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ProposalRow["status"] }) {
  const styles = {
    draft:
      "bg-gradient-to-r from-[hsl(var(--muted))] to-[hsl(var(--muted))]/80 text-[hsl(var(--muted-foreground))] shadow-sm",
    sent: "bg-gradient-to-r from-[hsl(var(--info))] to-[hsl(var(--info))]/80 text-white shadow-lg shadow-[hsl(var(--info))]/30",
    viewed:
      "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30",
    accepted:
      "bg-gradient-to-r from-[hsl(var(--success))] to-emerald-600 text-white shadow-lg shadow-[hsl(var(--success))]/30",
    rejected:
      "bg-gradient-to-r from-[hsl(var(--destructive))] to-red-600 text-white shadow-lg shadow-[hsl(var(--destructive))]/30",
  };

  const labels = {
    draft: "Draft",
    sent: "Sent",
    viewed: "Viewed",
    accepted: "Accepted",
    rejected: "Rejected",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function StatCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: number;
  variant?: "default" | "muted" | "info" | "warning" | "success";
}) {
  const gradients = {
    default:
      "from-[hsl(var(--primary))]/10 to-[hsl(var(--primary))]/5 border-[hsl(var(--primary))]/20",
    muted:
      "from-[hsl(var(--muted))]/20 to-[hsl(var(--muted))]/10 border-[hsl(var(--border))]",
    info: "from-[hsl(var(--info))]/10 to-[hsl(var(--info))]/5 border-[hsl(var(--info))]/20",
    warning:
      "from-amber-500/10 to-amber-500/5 border-amber-500/20",
    success:
      "from-[hsl(var(--success))]/10 to-[hsl(var(--success))]/5 border-[hsl(var(--success))]/20",
  };

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br p-5 shadow-lg backdrop-blur-sm ${gradients[variant]}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-bold text-[hsl(var(--foreground))]">
        {value}
      </p>
    </div>
  );
}

function EmptyState({ locale, canManage }: { locale: Locale; canManage: boolean }) {
  const router = useRouter();

  return (
    <div className="flex min-h-[500px] flex-col items-center justify-center rounded-3xl border border-dashed border-[hsl(var(--border))] bg-gradient-to-br from-[hsl(var(--surface-1))] to-[hsl(var(--surface-2))]/30 p-12 text-center backdrop-blur-sm">
      <div className="mx-auto max-w-md space-y-4">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary))]/60 shadow-2xl shadow-[hsl(var(--primary))]/30">
          <ExternalLink className="h-10 w-10 text-white" />
        </div>
        <h3 className="text-2xl font-bold">No proposals yet</h3>
        <p className="text-[hsl(var(--muted-foreground))]">
          Create your first web-based proposal and start closing deals with style.
        </p>
        {canManage && (
          <Button
            onClick={() => router.push(`/${locale}/proposals/new`)}
            size="lg"
            className="mt-6 gap-2 shadow-lg shadow-[hsl(var(--primary))]/20"
          >
            <Plus className="h-5 w-5" />
            Create Your First Proposal
          </Button>
        )}
      </div>
    </div>
  );
}

function formatDate(iso: string, locale: Locale): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  } catch {
    return iso.slice(0, 10);
  }
}
