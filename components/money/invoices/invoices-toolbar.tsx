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
import { INVOICE_STATUSES, type InvoiceStatus } from "@/features/money/schemas";

export interface InvoiceFilterState {
  search: string;
  status: InvoiceStatus | "any" | "overdue";
  clientId: string | "any";
  projectId: string | "any" | "none";
  from: string;
  to: string;
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
  filters: InvoiceFilterState;
  onFiltersChange: (next: InvoiceFilterState) => void;
  clients: ClientOption[];
  projects: ProjectOption[];
}

/**
 * Invoice toolbar — search, status, client, project, date range.
 * Filters live in the parent orchestrator so the URL syncer can serialise them.
 */
export function InvoicesToolbar({
  filters,
  onFiltersChange,
  clients,
  projects,
}: Props) {
  const t = useTranslations("Money.invoices");
  const tFilter = useTranslations("Money.invoices.filter");
  const tStatus = useTranslations("Money.invoices.status");

  const isActive =
    filters.search.trim().length > 0 ||
    filters.status !== "any" ||
    filters.clientId !== "any" ||
    filters.projectId !== "any" ||
    Boolean(filters.from) ||
    Boolean(filters.to);

  function clear() {
    onFiltersChange({
      search: "",
      status: "any",
      clientId: "any",
      projectId: "any",
      from: "",
      to: "",
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

      {/* Status */}
      <div className="md:col-span-2">
        <Label className="sr-only">{tFilter("status")}</Label>
        <Select
          value={filters.status}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              status: v as InvoiceStatus | "any" | "overdue",
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{tFilter("anyStatus")}</SelectItem>
            {INVOICE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {tStatus(s)}
              </SelectItem>
            ))}
            <SelectItem value="overdue">{tStatus("overdue")}</SelectItem>
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

      {/* Date range — From + To */}
      <div className="grid grid-cols-2 gap-2 md:col-span-4 md:contents">
        <div className="md:col-span-1">
          <Label htmlFor="inv-from" className="sr-only">
            {tFilter("from")}
          </Label>
          <Input
            id="inv-from"
            type="date"
            value={filters.from}
            onChange={(e) =>
              onFiltersChange({ ...filters, from: e.target.value })
            }
            placeholder={tFilter("from")}
          />
        </div>
        <div className="md:col-span-1">
          <Label htmlFor="inv-to" className="sr-only">
            {tFilter("to")}
          </Label>
          <Input
            id="inv-to"
            type="date"
            value={filters.to}
            onChange={(e) =>
              onFiltersChange({ ...filters, to: e.target.value })
            }
            placeholder={tFilter("to")}
          />
        </div>
      </div>

      {/* Clear button */}
      {isActive && (
        <div className="flex items-center md:col-span-12 md:justify-end">
          <button
            type="button"
            onClick={clear}
            className="inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          >
            <X className="h-3 w-3" />
            {tFilter("clear")}
          </button>
        </div>
      )}
    </div>
  );
}
