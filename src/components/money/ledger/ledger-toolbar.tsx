"use client";

import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FINANCE_KINDS, type FinanceKind } from "@/features/money/schemas";
import { cn } from "@/lib/utils";

export interface LedgerFilterState {
  search: string;
  kind: FinanceKind | "any";
  category: string | "any";
  clientId: string | "any" | "none";
  projectId: string | "any" | "none";
  from: string;
  to: string;
  hideInvoiceSynced: boolean;
}

interface ClientOption {
  id: string;
  name: string;
  company: string | null;
}
interface ProjectOption {
  id: string;
  name: string;
  clientLabel: string | null;
}

interface Props {
  filters: LedgerFilterState;
  onFiltersChange: (next: LedgerFilterState) => void;
  categories: string[];
  clients: ClientOption[];
  projects: ProjectOption[];
}

/**
 * Ledger toolbar — search, kind, category, client, project, date range,
 * and a toggle to hide invoice-synced rows. Filters live in the parent
 * orchestrator so the URL syncer there can serialise them.
 */
export function LedgerToolbar({
  filters,
  onFiltersChange,
  categories,
  clients,
  projects,
}: Props) {
  const t = useTranslations("Money.ledger");
  const tFilter = useTranslations("Money.ledger.filter");
  const tKind = useTranslations("Money.kind");

  const isActive =
    filters.search.trim().length > 0 ||
    filters.kind !== "any" ||
    filters.category !== "any" ||
    filters.clientId !== "any" ||
    filters.projectId !== "any" ||
    Boolean(filters.from) ||
    Boolean(filters.to) ||
    filters.hideInvoiceSynced;

  function clear() {
    onFiltersChange({
      search: "",
      kind: "any",
      category: "any",
      clientId: "any",
      projectId: "any",
      from: "",
      to: "",
      hideInvoiceSynced: false,
    });
  }

  return (
    <div className="grid gap-3 md:grid-cols-12">
      {/* Search — full width row on mobile, spans 4 on desktop */}
      <div className="relative md:col-span-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
        <Input
          value={filters.search}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value })
          }
          placeholder={t("search")}
          className="pl-9"
        />
      </div>

      {/* Kind */}
      <div className="md:col-span-2">
        <Label className="sr-only">{tFilter("kind")}</Label>
        <Select
          value={filters.kind}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, kind: v as FinanceKind | "any" })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{tFilter("anyKind")}</SelectItem>
            {FINANCE_KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {tKind(k)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category */}
      <div className="md:col-span-2">
        <Label className="sr-only">{tFilter("category")}</Label>
        <Select
          value={filters.category}
          onValueChange={(v) => onFiltersChange({ ...filters, category: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{tFilter("anyCategory")}</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Client */}
      <div className="md:col-span-2">
        <Label className="sr-only">{tFilter("client")}</Label>
        <Select
          value={filters.clientId}
          onValueChange={(v) => onFiltersChange({ ...filters, clientId: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{tFilter("anyClient")}</SelectItem>
            <SelectItem value="none">{tFilter("noClient")}</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.company || c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Project */}
      <div className="md:col-span-2">
        <Label className="sr-only">{tFilter("project")}</Label>
        <Select
          value={filters.projectId}
          onValueChange={(v) => onFiltersChange({ ...filters, projectId: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{tFilter("anyProject")}</SelectItem>
            <SelectItem value="none">{tFilter("noProject")}</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date range — From + To live on a second row on mobile */}
      <div className="grid grid-cols-2 gap-2 md:col-span-4 md:contents">
        <div className="md:col-span-2">
          <Label htmlFor="le-from" className="sr-only">
            {tFilter("from")}
          </Label>
          <Input
            id="le-from"
            type="date"
            value={filters.from}
            onChange={(e) =>
              onFiltersChange({ ...filters, from: e.target.value })
            }
            placeholder={tFilter("from")}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="le-to" className="sr-only">
            {tFilter("to")}
          </Label>
          <Input
            id="le-to"
            type="date"
            value={filters.to}
            onChange={(e) =>
              onFiltersChange({ ...filters, to: e.target.value })
            }
            placeholder={tFilter("to")}
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-2 md:col-span-4 md:justify-end">
        <button
          type="button"
          onClick={() =>
            onFiltersChange({
              ...filters,
              hideInvoiceSynced: !filters.hideInvoiceSynced,
            })
          }
          className={cn(
            "h-9 rounded-md border px-3 text-xs font-medium transition-colors",
            filters.hideInvoiceSynced
              ? "border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
              : "border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
          )}
        >
          {tFilter("hideInvoiceSynced")}
        </button>
        {isActive && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          >
            <X className="h-3 w-3" />
            {tFilter("clear")}
          </button>
        )}
      </div>
    </div>
  );
}
