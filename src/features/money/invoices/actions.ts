"use server";

import { revalidatePath } from "next/cache";
import { Types } from "mongoose";
import { customAlphabet } from "nanoid";

import { connectMongoose } from "@/lib/db/client";
import { FinanceEntry, Invoice } from "@/lib/db/models";
import { snapshotMoney } from "@/lib/currency/convert";
import { requireOrgContext } from "@/lib/auth/session";
import { assertRole } from "@/lib/permissions/check";
import type { Locale } from "@/i18n/routing";
import { allocateInvoiceNumber } from "./numbering";
import {
  invoiceFormSchema,
  type InvoiceFormInput,
} from "../schemas";

/**
 * Server actions for invoices.
 *
 * Permission: Admin+ for all write paths. Manager can read but never
 * mutate. The layout already gates the Money module at Manager+, so
 * these actions re-check Admin on every call.
 *
 * Invoice lifecycle: draft → sent → viewed → paid (or void).
 * - `draft` can be edited freely.
 * - `sent` / `viewed` / `paid` / `void` are immutable except for
 *   status transitions.
 * - Marking paid creates a synced FinanceEntry (`source: "invoice"`).
 * - Voiding or marking unpaid soft-deletes the synced entry.
 */

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const shareTokenAlphabet = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  28,
);

// ────────────────────────────────────────────────────────────
// Create
// ────────────────────────────────────────────────────────────

export async function createInvoiceAction(
  input: InvoiceFormInput,
  locale: Locale = "en",
): Promise<ActionResult<{ id: string; number: string }>> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "admin");

  const parsed = invoiceFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  await connectMongoose();

  // Allocate the next invoice number atomically.
  const { number, prefix, sequence } = await allocateInvoiceNumber(
    ctx.organizationId,
  );

  // Compute totals server-side — never trust client math.
  const items = parsed.data.items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.quantity * item.unitPrice,
  }));

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);

  // Tax rate: per-invoice override or workspace default.
  // We'll fetch the org's taxRate if override is null.
  const taxRate =
    parsed.data.taxRateOverride !== null
      ? parsed.data.taxRateOverride
      : await getOrgTaxRate(ctx.organizationId);

  const tax = (subtotal * taxRate) / 100;
  const total = subtotal + tax;

  // Snapshot the total in USD.
  const snap = await snapshotMoney({
    amount: total,
    currency: parsed.data.currency,
  });

  const created = await Invoice.create({
    organizationId: ctx.organizationId,
    number,
    prefix,
    sequence,
    clientId: new Types.ObjectId(parsed.data.clientId),
    projectId: parsed.data.projectId
      ? new Types.ObjectId(parsed.data.projectId)
      : null,
    subscriptionId: null,
    status: "draft",
    issueDate: new Date(parsed.data.issueDate),
    dueDate: new Date(parsed.data.dueDate),
    items,
    taxRateOverride: parsed.data.taxRateOverride,
    subtotal,
    tax,
    total,
    currency: parsed.data.currency,
    totalUsd: snap.amountUsd,
    exchangeRate: snap.exchangeRate,
    rateDate: snap.rateDate,
    notes: parsed.data.notes || null,
    terms: parsed.data.terms || null,
    shareToken: shareTokenAlphabet(),
    createdBy: ctx.session.userId,
  });

  revalidatePath(`/${locale}/money`);
  revalidatePath(`/${locale}/money/invoices`);
  return { ok: true, data: { id: created._id.toString(), number } };
}

// ────────────────────────────────────────────────────────────
// Update draft
// ────────────────────────────────────────────────────────────

export async function updateInvoiceDraftAction(
  invoiceId: string,
  input: InvoiceFormInput,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "admin");

  if (!invoiceId) return { ok: false, error: "Missing invoice id." };

  const parsed = invoiceFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  await connectMongoose();

  const existing = await Invoice.findOne({
    _id: invoiceId,
    organizationId: ctx.organizationId,
    deletedAt: null,
  })
    .select("status")
    .lean();

  if (!existing) return { ok: false, error: "Invoice not found." };
  if (existing.status !== "draft") {
    return {
      ok: false,
      error: "Only draft invoices can be edited.",
    };
  }

  const items = parsed.data.items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.quantity * item.unitPrice,
  }));

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const taxRate =
    parsed.data.taxRateOverride !== null
      ? parsed.data.taxRateOverride
      : await getOrgTaxRate(ctx.organizationId);
  const tax = (subtotal * taxRate) / 100;
  const total = subtotal + tax;

  const snap = await snapshotMoney({
    amount: total,
    currency: parsed.data.currency,
  });

  await Invoice.updateOne(
    { _id: invoiceId, organizationId: ctx.organizationId, deletedAt: null },
    {
      clientId: new Types.ObjectId(parsed.data.clientId),
      projectId: parsed.data.projectId
        ? new Types.ObjectId(parsed.data.projectId)
        : null,
      issueDate: new Date(parsed.data.issueDate),
      dueDate: new Date(parsed.data.dueDate),
      items,
      taxRateOverride: parsed.data.taxRateOverride,
      subtotal,
      tax,
      total,
      currency: parsed.data.currency,
      totalUsd: snap.amountUsd,
      exchangeRate: snap.exchangeRate,
      rateDate: snap.rateDate,
      notes: parsed.data.notes || null,
      terms: parsed.data.terms || null,
    },
  );

  revalidatePath(`/${locale}/money`);
  revalidatePath(`/${locale}/money/invoices`);
  revalidatePath(`/${locale}/money/invoices/${invoiceId}`);
  return { ok: true, data: undefined };
}

// ────────────────────────────────────────────────────────────
// Send
// ────────────────────────────────────────────────────────────

export async function sendInvoiceAction(
  invoiceId: string,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "admin");

  if (!invoiceId) return { ok: false, error: "Missing invoice id." };

  await connectMongoose();
  const doc = await Invoice.findOne({
    _id: invoiceId,
    organizationId: ctx.organizationId,
    deletedAt: null,
  });

  if (!doc) return { ok: false, error: "Invoice not found." };
  if (doc.status !== "draft") {
    return { ok: false, error: "Only draft invoices can be sent." };
  }

  doc.status = "sent";
  doc.sentAt = new Date();
  await doc.save();

  revalidatePath(`/${locale}/money`);
  revalidatePath(`/${locale}/money/invoices`);
  revalidatePath(`/${locale}/money/invoices/${invoiceId}`);
  return { ok: true, data: undefined };
}

// ────────────────────────────────────────────────────────────
// Mark paid
// ────────────────────────────────────────────────────────────

export async function markInvoicePaidAction(
  invoiceId: string,
  paidDate: string,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "admin");

  if (!invoiceId) return { ok: false, error: "Missing invoice id." };
  if (!paidDate) return { ok: false, error: "Paid date is required." };

  await connectMongoose();
  const doc = await Invoice.findOne({
    _id: invoiceId,
    organizationId: ctx.organizationId,
    deletedAt: null,
  });

  if (!doc) return { ok: false, error: "Invoice not found." };
  if (doc.status === "paid") {
    return { ok: false, error: "Invoice is already marked paid." };
  }
  if (doc.status === "void") {
    return { ok: false, error: "Cannot mark a voided invoice as paid." };
  }

  // Create a synced FinanceEntry.
  await FinanceEntry.create({
    organizationId: ctx.organizationId,
    kind: "income",
    category: "Invoice Payment",
    occurredOn: new Date(paidDate),
    description: `Payment for invoice ${doc.number}`,
    amount: doc.total,
    currency: doc.currency,
    amountUsd: doc.totalUsd,
    exchangeRate: doc.exchangeRate,
    rateDate: doc.rateDate,
    taxDeductible: false,
    taxCategory: null,
    recurring: { cadence: "none", nextReminderAt: null },
    receiptUrl: null,
    clientId: doc.clientId,
    projectId: doc.projectId,
    invoiceId: doc._id,
    source: "invoice",
    createdBy: ctx.session.userId,
  });

  doc.status = "paid";
  doc.paidDate = new Date(paidDate);
  await doc.save();

  revalidatePath(`/${locale}/money`);
  revalidatePath(`/${locale}/money/invoices`);
  revalidatePath(`/${locale}/money/invoices/${invoiceId}`);
  revalidatePath(`/${locale}/money/ledger`);
  return { ok: true, data: undefined };
}

// ────────────────────────────────────────────────────────────
// Mark unpaid
// ────────────────────────────────────────────────────────────

export async function markInvoiceUnpaidAction(
  invoiceId: string,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "admin");

  if (!invoiceId) return { ok: false, error: "Missing invoice id." };

  await connectMongoose();
  const doc = await Invoice.findOne({
    _id: invoiceId,
    organizationId: ctx.organizationId,
    deletedAt: null,
  });

  if (!doc) return { ok: false, error: "Invoice not found." };
  if (doc.status !== "paid") {
    return { ok: false, error: "Invoice is not marked paid." };
  }

  // Soft-delete the synced FinanceEntry.
  await FinanceEntry.updateMany(
    {
      organizationId: ctx.organizationId,
      invoiceId: doc._id,
      deletedAt: null,
    },
    { deletedAt: new Date() },
  );

  doc.status = "sent";
  doc.paidDate = null;
  await doc.save();

  revalidatePath(`/${locale}/money`);
  revalidatePath(`/${locale}/money/invoices`);
  revalidatePath(`/${locale}/money/invoices/${invoiceId}`);
  revalidatePath(`/${locale}/money/ledger`);
  return { ok: true, data: undefined };
}

// ────────────────────────────────────────────────────────────
// Void
// ────────────────────────────────────────────────────────────

export async function voidInvoiceAction(
  invoiceId: string,
  locale: Locale = "en",
): Promise<ActionResult> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "admin");

  if (!invoiceId) return { ok: false, error: "Missing invoice id." };

  await connectMongoose();
  const doc = await Invoice.findOne({
    _id: invoiceId,
    organizationId: ctx.organizationId,
    deletedAt: null,
  });

  if (!doc) return { ok: false, error: "Invoice not found." };
  if (doc.status === "void") {
    return { ok: false, error: "Invoice is already voided." };
  }

  // Soft-delete any synced FinanceEntry.
  await FinanceEntry.updateMany(
    {
      organizationId: ctx.organizationId,
      invoiceId: doc._id,
      deletedAt: null,
    },
    { deletedAt: new Date() },
  );

  doc.status = "void";
  doc.voidedAt = new Date();
  await doc.save();

  revalidatePath(`/${locale}/money`);
  revalidatePath(`/${locale}/money/invoices`);
  revalidatePath(`/${locale}/money/invoices/${invoiceId}`);
  revalidatePath(`/${locale}/money/ledger`);
  return { ok: true, data: undefined };
}

// ────────────────────────────────────────────────────────────
// Regenerate share token
// ────────────────────────────────────────────────────────────

export async function regenerateShareTokenAction(
  invoiceId: string,
  locale: Locale = "en",
): Promise<ActionResult<{ shareToken: string }>> {
  const ctx = await requireOrgContext(locale);
  assertRole(ctx.role, "admin");

  if (!invoiceId) return { ok: false, error: "Missing invoice id." };

  await connectMongoose();
  const doc = await Invoice.findOne({
    _id: invoiceId,
    organizationId: ctx.organizationId,
    deletedAt: null,
  });

  if (!doc) return { ok: false, error: "Invoice not found." };

  const newToken = shareTokenAlphabet();
  doc.shareToken = newToken;
  await doc.save();

  revalidatePath(`/${locale}/money/invoices/${invoiceId}`);
  return { ok: true, data: { shareToken: newToken } };
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

async function getOrgTaxRate(organizationId: string): Promise<number> {
  const { Organization } = await import("@/lib/db/models");
  const org = await Organization.findById(organizationId)
    .select("taxRate")
    .lean();
  return org?.taxRate ?? 0;
}
