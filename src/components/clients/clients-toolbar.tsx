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
import type { ClientFilters } from "@/features/clients/queries";
import { CLIENT_STATUSES } from "@/features/clients/constants";

interface Props {
  filters: ClientFilters;
  onFiltersChange: (filters: ClientFilters) => void;
  tags: string[];
}

/**
 * Filter / search toolbar for the clients list. Lifted state lives in the
 * parent so URL params can be synced if we want to do that later.
 */
export function ClientsToolbar({ filters, onFiltersChange, tags }: Props) {
  const t = useTranslations("Clients");
  const tFilter = useTranslations("Clients.filter");
  const tStatus = useTranslations("Clients.status");
  const tSort = useTranslations("Clients.sort");

  const hasFilters =
    Boolean(filters.search?.trim()) ||
    (filters.status && filters.status !== "any") ||
    Boolean(filters.tag) ||
    filters.showArchived;

  return (
    <div className="grid gap-3 md:flex md:flex-wrap md:items-end">
      {/* Search */}
      <div className="relative md:flex-1 md:min-w-[260px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
        <Input
          value={filters.search ?? ""}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value })
          }
          placeholder={t("search")}
          className="pl-9"
        />
      </div>

      {/* Status */}
      <div className="space-y-1.5 md:space-y-0">
        <Label className="md:sr-only">{tFilter("status")}</Label>
        <Select
          value={filters.status ?? "any"}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              status: v as ClientFilters["status"],
            })
          }
        >
          <SelectTrigger className="md:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{tFilter("anyStatus")}</SelectItem>
            {CLIENT_STATUSES.filter((s) => s !== "archived").map((s) => (
              <SelectItem key={s} value={s}>
                {tStatus(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tag */}
      {tags.length > 0 && (
        <div className="space-y-1.5 md:space-y-0">
          <Label className="md:sr-only">{tFilter("tag")}</Label>
          <Select
            value={filters.tag ?? "__any"}
            onValueChange={(v) =>
              onFiltersChange({
                ...filters,
                tag: v === "__any" ? undefined : v,
              })
            }
          >
            <SelectTrigger className="md:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__any">{tFilter("anyTag")}</SelectItem>
              {tags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Sort */}
      <div className="space-y-1.5 md:space-y-0">
        <Label className="md:sr-only">{tSort("label")}</Label>
        <Select
          value={filters.sort ?? "recent"}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              sort: v as NonNullable<ClientFilters["sort"]>,
            })
          }
        >
          <SelectTrigger className="md:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">{tSort("recent")}</SelectItem>
            <SelectItem value="name">{tSort("name")}</SelectItem>
            <SelectItem value="revenue">{tSort("revenue")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Archived toggle */}
      <button
        type="button"
        onClick={() =>
          onFiltersChange({
            ...filters,
            showArchived: !filters.showArchived,
          })
        }
        className={
          filters.showArchived
            ? "h-9 rounded-md border border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/10 px-3 text-xs font-medium text-[hsl(var(--primary))]"
            : "h-9 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-3 text-xs font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        }
      >
        {tFilter("showArchived")}
      </button>

      {hasFilters && (
        <button
          type="button"
          onClick={() =>
            onFiltersChange({
              search: "",
              status: "any",
              tag: undefined,
              showArchived: false,
              sort: filters.sort ?? "recent",
            })
          }
          className="inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        >
          <X className="h-3 w-3" />
          {tFilter("clear")}
        </button>
      )}
    </div>
  );
}
