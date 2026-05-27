import "server-only";

import { Types } from "mongoose";

import { connectMongoose } from "@/lib/db/client";
import { Lead, User } from "@/lib/db/models";
import {
  ACTIVE_STAGES,
  type LeadSource,
  type LeadStage,
} from "./constants";

export interface LeadFilters {
  search?: string;
  stage?: LeadStage | "any";
  ownerId?: string | "any";
  source?: LeadSource | "any";
}

export interface LeadOwner {
  id: string;
  name: string | null;
  email: string;
}

export interface LeadRow {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  stage: LeadStage;
  source: LeadSource;

  estimatedAmount: number;
  estimatedCurrency: "USD" | "BDT";
  estimatedAmountUsd: number;
  estimatedRateDate: string | null;

  owner: LeadOwner | null;
  nextActionAt: string | null;
  nextActionNote: string | null;
  notes: string | null;

  convertedClientId: string | null;
  convertedAt: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface LeadStats {
  total: number;
  active: number;
  won: number;
  lost: number;
  /** USD-normalised pipeline value across active stages. */
  activeValueUsd: number;
  /** Conversion rate = won / (won + lost). */
  conversionRate: number;
}

/** Lists leads in an org, joined with owner info. */
export async function listLeads(
  organizationId: string,
  filters: LeadFilters = {},
): Promise<LeadRow[]> {
  await connectMongoose();

  const query: Record<string, unknown> = {
    organizationId,
    deletedAt: null,
  };

  if (filters.stage && filters.stage !== "any") query.stage = filters.stage;
  if (filters.ownerId && filters.ownerId !== "any") {
    query.ownerId = new Types.ObjectId(filters.ownerId);
  }
  if (filters.source && filters.source !== "any") query.source = filters.source;

  if (filters.search?.trim()) {
    const escaped = filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "i");
    query.$or = [{ name: re }, { company: re }, { email: re }];
  }

  const docs = await Lead.find(query).sort({ updatedAt: -1 }).lean();

  // Fetch owner details in one round trip.
  const ownerIds = Array.from(
    new Set(
      docs
        .map((d) => d.ownerId?.toString())
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const owners = ownerIds.length
    ? await User.find({ _id: { $in: ownerIds } })
        .select("name email")
        .lean()
    : [];
  const ownerMap = new Map<string, LeadOwner>(
    owners.map((u) => [
      u._id.toString(),
      {
        id: u._id.toString(),
        name: u.name ?? null,
        email: u.email ?? "",
      },
    ]),
  );

  return docs.map((d) => toRow(d, ownerMap));
}

export async function getLeadById(
  organizationId: string,
  leadId: string,
): Promise<LeadRow | null> {
  await connectMongoose();
  const doc = await Lead.findOne({
    _id: leadId,
    organizationId,
    deletedAt: null,
  }).lean();
  if (!doc) return null;

  const ownerMap = new Map<string, LeadOwner>();
  if (doc.ownerId) {
    const owner = await User.findById(doc.ownerId).select("name email").lean();
    if (owner) {
      ownerMap.set(doc.ownerId.toString(), {
        id: doc.ownerId.toString(),
        name: owner.name ?? null,
        email: owner.email ?? "",
      });
    }
  }
  return toRow(doc, ownerMap);
}

/** Pipeline stats for the page header. */
export async function getLeadStats(organizationId: string): Promise<LeadStats> {
  await connectMongoose();

  const [agg] = (await Lead.aggregate([
    { $match: { organizationId: new Types.ObjectId(organizationId), deletedAt: null } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: {
          $sum: {
            $cond: [{ $in: ["$stage", ACTIVE_STAGES] }, 1, 0],
          },
        },
        won: { $sum: { $cond: [{ $eq: ["$stage", "won"] }, 1, 0] } },
        lost: { $sum: { $cond: [{ $eq: ["$stage", "lost"] }, 1, 0] } },
        activeValueUsd: {
          $sum: {
            $cond: [
              { $in: ["$stage", ACTIVE_STAGES] },
              "$estimatedAmountUsd",
              0,
            ],
          },
        },
      },
    },
  ])) as Array<{
    total: number;
    active: number;
    won: number;
    lost: number;
    activeValueUsd: number;
  }>;

  const decided = (agg?.won ?? 0) + (agg?.lost ?? 0);
  const conversionRate =
    decided === 0 ? 0 : Math.round(((agg?.won ?? 0) / decided) * 100);

  return {
    total: agg?.total ?? 0,
    active: agg?.active ?? 0,
    won: agg?.won ?? 0,
    lost: agg?.lost ?? 0,
    activeValueUsd: Math.round(agg?.activeValueUsd ?? 0),
    conversionRate,
  };
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function toRow(
  doc: Record<string, unknown>,
  ownerMap: Map<string, LeadOwner>,
): LeadRow {
  const id = (doc._id as { toString(): string }).toString();
  const ownerId = doc.ownerId
    ? (doc.ownerId as { toString(): string }).toString()
    : null;
  return {
    id,
    name: String(doc.name ?? ""),
    company: (doc.company as string | null) ?? null,
    email: (doc.email as string | null) ?? null,
    phone: (doc.phone as string | null) ?? null,
    stage: (doc.stage as LeadStage) ?? "new",
    source: (doc.source as LeadSource) ?? "other",
    estimatedAmount: Number(doc.estimatedAmount ?? 0),
    estimatedCurrency: ((doc.estimatedCurrency as "USD" | "BDT") ??
      "USD") as "USD" | "BDT",
    estimatedAmountUsd: Number(doc.estimatedAmountUsd ?? 0),
    estimatedRateDate: (doc.estimatedRateDate as string | null) ?? null,
    owner: ownerId ? ownerMap.get(ownerId) ?? null : null,
    nextActionAt: doc.nextActionAt
      ? new Date(doc.nextActionAt as string | Date).toISOString()
      : null,
    nextActionNote: (doc.nextActionNote as string | null) ?? null,
    notes: (doc.notes as string | null) ?? null,
    convertedClientId: doc.convertedClientId
      ? (doc.convertedClientId as { toString(): string }).toString()
      : null,
    convertedAt: doc.convertedAt
      ? new Date(doc.convertedAt as string | Date).toISOString()
      : null,
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  return new Date().toISOString();
}
