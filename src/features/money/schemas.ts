/**
 * Shared zod schemas for the Money module.
 *
 * Lives in `features/money` (not `lib/db`) so client components can pull
 * the *form* schemas without dragging Mongoose into the browser bundle.
 * The Mongoose models in `lib/db/models/*` import the type aliases from
 * here to stay in sync with form validation.
 */

import { z } from "zod";

import { moneyInputSchema } from "@/lib/currency/schemas";

// ────────────────────────────────────────────────────────────
// Finance entry
// ────────────────────────────────────────────────────────────

export const FINANCE_KINDS = ["income", "expense"] as const;
export type FinanceKind = (typeof FINANCE_KINDS)[number];

export const FINANCE_RECURRING_CADENCES = [
  "none",
  "monthly",
  "yearly",
] as const;
export type FinanceRecurringCadence =
  (typeof FINANCE_RECURRING_CADENCES)[number];

/**
 * Finance entries are written in two ways:
 *  - Manually by a user (Admin+).
 *  - Synced from an invoice when it's marked paid.
 *
 * `source` is server-set: clients never get to choose. UI infers it from
 * the read-side payload.
 */
export const FINANCE_SOURCES = ["manual", "invoice"] as const;
export type FinanceSource = (typeof FINANCE_SOURCES)[number];

export const financeEntryFormSchema = z
  .object({
    kind: z.enum(FINANCE_KINDS),
    category: z.string().trim().min(1, "Category is required").max(80),
    occurredOn: z.string().min(8, "Pick a date"), // yyyy-mm-dd
    description: z
      .string()
      .max(2_000)
      .optional()
      .transform((v) => v ?? ""),

    taxDeductible: z.boolean().default(false),
    taxCategory: z
      .string()
      .max(60)
      .optional()
      .transform((v) => v ?? ""),

    recurringCadence: z
      .enum(FINANCE_RECURRING_CADENCES)
      .default("none"),
    nextReminderAt: z
      .string()
      .nullable()
      .optional()
      .transform((v) => v ?? null),

    receiptUrl: z
      .string()
      .url("Receipt must be a URL")
      .or(z.literal(""))
      .optional()
      .transform((v) => v ?? ""),

    clientId: z
      .string()
      .nullable()
      .optional()
      .transform((v) => v ?? null),
    projectId: z
      .string()
      .nullable()
      .optional()
      .transform((v) => v ?? null),
  })
  // The five money fields — amount, currency etc.
  .merge(moneyInputSchema);

export type FinanceEntryFormInput = z.infer<typeof financeEntryFormSchema>;

// ────────────────────────────────────────────────────────────
// Invoice
// ────────────────────────────────────────────────────────────

export const INVOICE_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "paid",
  "void",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

/**
 * UI-only "overdue" pseudo-status. Computed at render time from
 * `dueDate` + `status` ∈ { sent, viewed }. Never persisted.
 */
export type InvoiceDisplayStatus = InvoiceStatus | "overdue";

export const invoiceLineItemSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Line item description required")
    .max(240),
  quantity: z
    .number({ invalid_type_error: "Quantity must be a number" })
    .min(0)
    .max(1_000_000),
  unitPrice: z
    .number({ invalid_type_error: "Unit price must be a number" })
    .min(0),
});

export type InvoiceLineItemInput = z.infer<typeof invoiceLineItemSchema>;

/**
 * Form-level invoice schema. Server actions extend this with
 * `clientId`, `issueDate`, etc., and recompute totals before persisting.
 */
export const invoiceFormSchema = z.object({
  clientId: z.string().min(1, "Pick a client"),
  projectId: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v ?? null),

  issueDate: z.string().min(8),
  dueDate: z.string().min(8),

  items: z.array(invoiceLineItemSchema).min(1, "Add at least one line item"),

  currency: z.enum(["USD", "BDT"]),
  taxRateOverride: z
    .number({ invalid_type_error: "Tax rate must be a number" })
    .min(0)
    .max(100)
    .nullable()
    .optional()
    .transform((v) => v ?? null),

  notes: z
    .string()
    .max(2_000)
    .optional()
    .transform((v) => v ?? ""),
  terms: z
    .string()
    .max(2_000)
    .optional()
    .transform((v) => v ?? ""),
});

export type InvoiceFormInput = z.infer<typeof invoiceFormSchema>;

// ────────────────────────────────────────────────────────────
// Subscription
// ────────────────────────────────────────────────────────────

export const SUBSCRIPTION_STATUSES = [
  "active",
  "paused",
  "cancelled",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const SUBSCRIPTION_CYCLES = [
  "monthly",
  "quarterly",
  "yearly",
] as const;
export type SubscriptionCycle = (typeof SUBSCRIPTION_CYCLES)[number];

export const subscriptionFormSchema = z
  .object({
    clientId: z.string().min(1, "Pick a client"),
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(120),
    cycle: z.enum(SUBSCRIPTION_CYCLES),
    startedAt: z.string().min(8),
    autoInvoice: z.boolean().default(true),
    noteForInvoice: z
      .string()
      .max(240)
      .optional()
      .transform((v) => v ?? ""),
  })
  .merge(moneyInputSchema);

export type SubscriptionFormInput = z.infer<typeof subscriptionFormSchema>;
