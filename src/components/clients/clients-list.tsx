"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Users } from "lucide-react";

import { ClientCard } from "./client-card";
import { ClientFormDialog } from "./client-form-dialog";
import { ClientsToolbar } from "./clients-toolbar";
import { EmptyState } from "@/components/layout/empty-state";
import type {
  ClientDetail,
  ClientFilters,
  ClientRow,
} from "@/features/clients/queries";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
  initialClients: ClientRow[];
  tags: string[];
  canManage: boolean;
}

/**
 * Client-side list orchestrator.
 *
 * - Receives the full client list from the server (Phase 7a doesn't paginate
 *   yet — agencies typically have < 500 clients, well within client-side
 *   filtering).
 * - Search + filter happens locally for snappy UX. If the workspace grows
 *   beyond comfortable client-side filtering we'll move filters into the
 *   URL and re-fetch.
 * - Owns the create/edit dialog state.
 */
export function ClientsList({
  locale,
  initialClients,
  tags,
  canManage,
}: Props) {
  const t = useTranslations("Clients");

  const [filters, setFilters] = useState<ClientFilters>({
    sort: "recent",
    status: "any",
  });
  const deferredFilters = useDeferredValue(filters);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientDetail | null>(null);

  const visible = useMemo(
    () => applyFilters(initialClients, deferredFilters),
    [initialClients, deferredFilters],
  );

  const hasAnyClients = initialClients.length > 0;
  const hasResults = visible.length > 0;

  function openCreate() {
    setEditingClient(null);
    setDialogOpen(true);
  }

  function openEdit(client: ClientRow) {
    // Cards have only ClientRow data; the detail page brings in notes for
    // editing there. List-level edit just hydrates with what we have.
    setEditingClient({ ...client, notes: null });
    setDialogOpen(true);
  }

  return (
    <div className="space-y-5">
      {hasAnyClients && (
        <ClientsToolbar
          filters={filters}
          onFiltersChange={setFilters}
          tags={tags}
        />
      )}

      {!hasAnyClients ? (
        <EmptyState
          icon={Users}
          title={t("empty.title")}
          description={t("empty.subtitle")}
          action={
            canManage ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-glow)] hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("empty.cta")}
              </button>
            ) : undefined
          }
        />
      ) : !hasResults ? (
        <EmptyState
          icon={Users}
          variant="filtered"
          title={t("filtered.title")}
          description={t("filtered.subtitle")}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {visible.map((client) => (
            <ClientCard
              key={client.id}
              locale={locale}
              client={client}
              onEdit={() => openEdit(client)}
            />
          ))}
        </div>
      )}

      {canManage && (
        <ClientFormDialog
          locale={locale}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          client={editingClient}
        />
      )}

      {/* Floating "create" button outside the empty state — desktop-only. */}
      {canManage && hasAnyClients && (
        <ClientsCreateButton onClick={openCreate} />
      )}
    </div>
  );
}

// Header-mounted button is exported below; this is a hidden spacer hook.
function ClientsCreateButton({ onClick }: { onClick: () => void }) {
  // Stash the open trigger on a custom element so the page header's button
  // can dispatch a click via querySelector. Keeping the button visually in
  // the header (matching all other module pages) but the dialog state in
  // this list-level component avoids prop drilling.
  return (
    <button
      type="button"
      data-clients-create-trigger
      onClick={onClick}
      className="sr-only"
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}

// ────────────────────────────────────────────────────────────
// Filtering — pure client-side over the seed list
// ────────────────────────────────────────────────────────────

function applyFilters(rows: ClientRow[], filters: ClientFilters): ClientRow[] {
  let out = rows;

  if (filters.status && filters.status !== "any") {
    out = out.filter((c) => c.status === filters.status);
  } else if (!filters.showArchived) {
    out = out.filter((c) => c.status !== "archived");
  }

  if (filters.tag) {
    out = out.filter((c) => c.tags.includes(filters.tag!));
  }

  if (filters.search?.trim()) {
    const needle = filters.search.trim().toLowerCase();
    out = out.filter(
      (c) =>
        c.name.toLowerCase().includes(needle) ||
        (c.company ?? "").toLowerCase().includes(needle) ||
        (c.email ?? "").toLowerCase().includes(needle),
    );
  }

  switch (filters.sort ?? "recent") {
    case "name":
      out = [...out].sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "revenue":
      out = [...out].sort((a, b) => b.totalRevenueUsd - a.totalRevenueUsd);
      break;
    case "recent":
    default:
      out = [...out].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      break;
  }

  return out;
}
