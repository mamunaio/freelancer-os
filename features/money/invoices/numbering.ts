import "server-only";

import { connectMongoose } from "@/lib/db/client";
import { NumberSequence, Organization } from "@/lib/db/models";

/**
 * Allocate the next invoice number for an organization.
 *
 * Uses `findOneAndUpdate` with `$inc` to atomically bump the counter.
 * Concurrent calls serialise on the document lock — no duplicates.
 * If the invoice insert later fails, the sequence has already advanced
 * (we accept potential gaps from rollback rather than risk duplicates).
 *
 * Returns: `{ number: "INV-0042", prefix: "INV-", sequence: 42 }`
 */
export async function allocateInvoiceNumber(
  organizationId: string,
): Promise<{ number: string; prefix: string; sequence: number }> {
  await connectMongoose();

  // Fetch the org's current prefix (defaults to "INV-" if not set).
  const org = await Organization.findById(organizationId)
    .select("invoicePrefix")
    .lean();
  const prefix = org?.invoicePrefix || "INV-";

  // Atomically increment the sequence counter.
  const doc = await NumberSequence.findOneAndUpdate(
    { organizationId, scope: "invoice" },
    { $inc: { next: 1 }, $setOnInsert: { prefix } },
    { upsert: true, new: true, lean: true },
  );

  const sequence = doc.next;
  const number = `${prefix}${String(sequence).padStart(4, "0")}`;

  return { number, prefix, sequence };
}
