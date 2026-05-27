"use server";

import { revalidatePath } from "next/cache";
import { Types } from "mongoose";

import { connectMongoose } from "@/lib/db/client";
import { FinanceEntry } from "@/lib/db/models";
import { snapshotMoney } from "@/lib/currency/convert";
import { requireOrgContext } from "@/lib/auth/session";
import { assertRole } from "@/lib/permissions/check";
import type { Locale } from "@/i18n/routing";

import {
  financeEntryFormSchema,
  type FinanceEntryFormInput,
} from "../schemas";

/**
 * Server actions for the ledger.
 *
 * Permission: Admin+ for write paths. Manager and below would never
 * have reached the layout that mounts the ledger surface — but we
 * re-derive on every action so direct calls fail closed.
 *
 * Synced rows (`source === "invoice"`) reject edit/delete because
 * they're driven by the source invoice. The user gets a tooltip
 * pointing them to the invoice instead.
 */

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ────────────────────────────────────────────────────────────
// Create
// ────────────────────────────────────────────────────────────

export async function createFinanceEntryAction(
  input: FinanceEntryFormInput,
  locale: Locale = "en",
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "admin");

  const parsed = financeEntryFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  await connectMongoose();

  const snap = await snapshotMoney({
    amount: parsed.data.amount,
    currency: parsed.data.currency,
  });

  // Compute next reminder for recurring entries — one cycle after
  // `occurredOn`. Manual entries don't auto-post, but we surface the
  // reminder card on the ledger.
  let nextReminderAt: Date | null = null;
  if (parsed.data.nextReminderAt) {
    nextReminderAt = new Date(parsed.data.nextReminderAt);
  } else if (parsed.data.recurringCadence !== "none") {
    nextReminderAt = computeReminder(
      new Date(parsed.data.occurredOn),
      parsed.data.recurringCadence,
    );
  }

  const created = await FinanceEntry.create({
    organizationId: ctx.organizationId,
    kind: parsed.data.kind,
    category: parsed.data.category,
    occurredOn: new Date(parsed.data.occurredOn),
    description: parsed.data.description || null,

    amount: snap.amount,
    currency: snap.currency,
    amountUsd: snap.amountUsd,
    exchangeRate: snap.exchangeRate,
    rateDate: snap.rateDate,

    taxDeductible: parsed.data.taxDeductible,
    taxCategory: parsed.data.taxCategory || null,

    recurring: {
      cadence: parsed.data.recurringCadence,
      nextReminderAt,
    },

    receiptUrl: parsed.data.receiptUrl || null,

    clientId: parsed.data.clientId
      ? new Types.ObjectId(parsed.data.clientId)
      : null,
    projectId: parsed.data.projectId
      ? new Types.ObjectId(parsed.data.projectId)
      : null,

    source: "manual",
    createdBy: ctx.session.userId,
  });

  revalidatePath(`/${locale}/money`);
  revalidatePath(`/${locale}/money/ledger`);
  return { ok: true, data: { id: created._id.toString() } };
}

// ────────────────────────────────────────────────────────────
// Update
// ────────────────────────────────────────────────────────────

export async function updateFinanceEntryAction(
  entryId: string,
  input: FinanceEntryFormInput,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "admin");

  if (!entryId) return { ok: false, error: "Missing entry id." };

  const parsed = financeEntryFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  await connectMongoose();

  // Reject edits on invoice-synced rows.
  const existing = await FinanceEntry.findOne({
    _id: entryId,
    organizationId: ctx.organizationId,
    deletedAt: null,
  })
    .select("source")
    .lean();

  if (!existing) return { ok: false, error: "Entry not found." };
  if (existing.source === "invoice") {
    return {
      ok: false,
      error:
        "This entry is synced from an invoice. Edit the invoice instead.",
    };
  }

  const snap = await snapshotMoney({
    amount: parsed.data.amount,
    currency: parsed.data.currency,
  });

  let nextReminderAt: Date | null = null;
  if (parsed.data.nextReminderAt) {
    nextReminderAt = new Date(parsed.data.nextReminderAt);
  } else if (parsed.data.recurringCadence !== "none") {
    nextReminderAt = computeReminder(
      new Date(parsed.data.occurredOn),
      parsed.data.recurringCadence,
    );
  }

  await FinanceEntry.updateOne(
    { _id: entryId, organizationId: ctx.organizationId, deletedAt: null },
    {
      kind: parsed.data.kind,
      category: parsed.data.category,
      occurredOn: new Date(parsed.data.occurredOn),
      description: parsed.data.description || null,
      amount: snap.amount,
      currency: snap.currency,
      amountUsd: snap.amountUsd,
      exchangeRate: snap.exchangeRate,
      rateDate: snap.rateDate,
      taxDeductible: parsed.data.taxDeductible,
      taxCategory: parsed.data.taxCategory || null,
      recurring: {
        cadence: parsed.data.recurringCadence,
        nextReminderAt,
      },
      receiptUrl: parsed.data.receiptUrl || null,
      clientId: parsed.data.clientId
        ? new Types.ObjectId(parsed.data.clientId)
        : null,
      projectId: parsed.data.projectId
        ? new Types.ObjectId(parsed.data.projectId)
        : null,
    },
  );

  revalidatePath(`/${locale}/money`);
  revalidatePath(`/${locale}/money/ledger`);
  return { ok: true, data: undefined };
}

// ────────────────────────────────────────────────────────────
// Delete (soft)
// ────────────────────────────────────────────────────────────

export async function deleteFinanceEntryAction(
  entryId: string,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "admin");

  if (!entryId) return { ok: false, error: "Missing entry id." };

  await connectMongoose();
  const existing = await FinanceEntry.findOne({
    _id: entryId,
    organizationId: ctx.organizationId,
    deletedAt: null,
  })
    .select("source")
    .lean();

  if (!existing) return { ok: false, error: "Entry not found." };
  if (existing.source === "invoice") {
    return {
      ok: false,
      error:
        "Synced from an invoice — void the invoice to remove this row.",
    };
  }

  await FinanceEntry.updateOne(
    { _id: entryId, organizationId: ctx.organizationId, deletedAt: null },
    { deletedAt: new Date() },
  );

  revalidatePath(`/${locale}/money`);
  revalidatePath(`/${locale}/money/ledger`);
  return { ok: true, data: undefined };
}

// ────────────────────────────────────────────────────────────
// Reminder dismissal
// ────────────────────────────────────────────────────────────

export async function dismissReminderAction(
  entryId: string,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "admin");

  if (!entryId) return { ok: false, error: "Missing entry id." };

  await connectMongoose();
  const doc = await FinanceEntry.findOne({
    _id: entryId,
    organizationId: ctx.organizationId,
    deletedAt: null,
  });
  if (!doc) return { ok: false, error: "Entry not found." };

  const cadence = doc.recurring?.cadence ?? "none";
  if (cadence === "none") {
    return { ok: false, error: "Entry is not recurring." };
  }

  const dismissedAt = new Date();
  doc.recurring = {
    cadence,
    nextReminderAt: computeReminder(
      doc.recurring?.nextReminderAt ?? new Date(),
      cadence as "monthly" | "yearly",
    ),
    dismissedRemindersAt: [
      ...(doc.recurring?.dismissedRemindersAt ?? []),
      dismissedAt,
    ],
  };
  await doc.save();

  revalidatePath(`/${locale}/money/ledger`);
  return { ok: true, data: undefined };
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function computeReminder(
  from: Date,
  cadence: "monthly" | "yearly",
): Date {
  const next = new Date(from);
  if (cadence === "monthly") next.setMonth(next.getMonth() + 1);
  else next.setFullYear(next.getFullYear() + 1);
  return next;
}
