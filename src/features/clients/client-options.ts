import "server-only";

import { connectMongoose } from "@/lib/db/client";
import { Client } from "@/lib/db/models";

/**
 * Lightweight client option list — used by Project picker, Lead conversion,
 * Invoice creator, etc.
 */

export interface ClientOption {
  id: string;
  name: string;
  company: string | null;
}

export async function listClientOptions(
  organizationId: string,
): Promise<ClientOption[]> {
  await connectMongoose();
  const docs = await Client.find({
    organizationId,
    deletedAt: null,
    status: { $ne: "archived" },
  })
    .select("name company")
    .sort({ name: 1 })
    .lean();

  return docs.map((d) => ({
    id: d._id.toString(),
    name: String(d.name ?? ""),
    company: (d.company as string | null) ?? null,
  }));
}
