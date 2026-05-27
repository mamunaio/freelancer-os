import "server-only";

import { connectMongoose } from "@/lib/db/client";
import { Client } from "@/lib/db/models";
import { CLIENT_STATUSES, type ClientStatus } from "@/features/clients/constants";

/**
 * Read helpers for the Clients module. Returns plain JSON so server pages
 * can pass results into client components without further serialization.
 */

export interface ClientFilters {
  /** Free-text search across name, company, email. */
  search?: string;
  /** Filter by status. `null` means "any". */
  status?: ClientStatus | "any";
  /** Filter by tag (single tag — extend to multi later if needed). */
  tag?: string;
  /** Sort order. */
  sort?: "recent" | "name" | "revenue";
  /** Include archived/deleted in results. */
  showArchived?: boolean;
}

export interface ClientRow {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: ClientStatus;
  tags: string[];
  totalRevenueUsd: number;
  portalToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientDetail extends ClientRow {
  notes: string | null;
}

const sortFields: Record<NonNullable<ClientFilters["sort"]>, Record<string, 1 | -1>> = {
  recent: { updatedAt: -1 },
  name: { name: 1 },
  revenue: { totalRevenueUsd: -1, updatedAt: -1 },
};

/** Lists clients in an org with filters applied. */
export async function listClients(
  organizationId: string,
  filters: ClientFilters = {},
): Promise<ClientRow[]> {
  await connectMongoose();

  const query: Record<string, unknown> = {
    organizationId,
    deletedAt: filters.showArchived ? { $exists: true } : null,
  };

  if (filters.status && filters.status !== "any") {
    query.status = filters.status;
  } else if (!filters.showArchived) {
    // By default exclude archived from "any" results.
    query.status = { $in: CLIENT_STATUSES.filter((s) => s !== "archived") };
  }

  if (filters.tag) {
    query.tags = filters.tag;
  }

  if (filters.search?.trim()) {
    const escaped = filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "i");
    query.$or = [{ name: re }, { company: re }, { email: re }];
  }

  const sort = sortFields[filters.sort ?? "recent"];

  const docs = await Client.find(query).sort(sort).lean();
  return docs.map(toRow);
}

export async function getClientById(
  organizationId: string,
  clientId: string,
): Promise<ClientDetail | null> {
  await connectMongoose();

  const doc = await Client.findOne({
    _id: clientId,
    organizationId,
  }).lean();

  if (!doc) return null;
  return {
    ...toRow(doc),
    notes: (doc.notes as string | null) ?? null,
  };
}

/** Returns a flat list of every distinct tag in use, sorted alphabetically. */
export async function listClientTags(organizationId: string): Promise<string[]> {
  await connectMongoose();
  const tags = await Client.distinct<string>("tags", {
    organizationId,
    deletedAt: null,
  });
  return tags.filter(Boolean).sort((a, b) => a.localeCompare(b));
}

/** Quick stats for the list-page header. */
export interface ClientStats {
  total: number;
  active: number;
  paused: number;
  archived: number;
  totalRevenueUsd: number;
}

export async function getClientStats(organizationId: string): Promise<ClientStats> {
  await connectMongoose();

  const [counts] = (await Client.aggregate([
    { $match: { organizationId: toObjectId(organizationId), deletedAt: null } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: {
          $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
        },
        paused: {
          $sum: { $cond: [{ $eq: ["$status", "paused"] }, 1, 0] },
        },
        archived: {
          $sum: { $cond: [{ $eq: ["$status", "archived"] }, 1, 0] },
        },
        totalRevenueUsd: { $sum: "$totalRevenueUsd" },
      },
    },
  ])) as Array<{
    total: number;
    active: number;
    paused: number;
    archived: number;
    totalRevenueUsd: number;
  }>;

  return {
    total: counts?.total ?? 0,
    active: counts?.active ?? 0,
    paused: counts?.paused ?? 0,
    archived: counts?.archived ?? 0,
    totalRevenueUsd: counts?.totalRevenueUsd ?? 0,
  };
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

import { Types } from "mongoose";

function toObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

function toRow(doc: Record<string, unknown>): ClientRow {
  const id = (doc._id as { toString(): string }).toString();
  return {
    id,
    name: String(doc.name ?? ""),
    company: (doc.company as string | null) ?? null,
    email: (doc.email as string | null) ?? null,
    phone: (doc.phone as string | null) ?? null,
    status: (doc.status as ClientStatus) ?? "active",
    tags: Array.isArray(doc.tags) ? (doc.tags as string[]) : [],
    totalRevenueUsd: Number(doc.totalRevenueUsd ?? 0),
    portalToken: String(doc.portalToken ?? ""),
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  return new Date().toISOString();
}
