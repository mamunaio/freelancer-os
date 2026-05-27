/**
 * Read-side DTOs for the Money module.
 *
 * Server queries return these plain JSON shapes so they can be passed into
 * client components from server pages without further serialization.
 */

import type { Currency } from "@/lib/currency/types";
import type {
  FinanceKind,
  FinanceRecurringCadence,
  FinanceSource,
  InvoiceStatus,
  SubscriptionCycle,
  SubscriptionStatus,
} from "./schemas";

// ────────────────────────────────────────────────────────────
// Finance entry
// ────────────────────────────────────────────────────────────

export interface FinanceEntryRow {
  id: string;

  kind: FinanceKind;
  category: string;
  occurredOn: string;
  description: string | null;

  amount: number;
  currency: Currency;
  amountUsd: number;
  exchangeRate: number;
  rateDate: string;

  taxDeductible: boolean;
  taxCategory: string | null;

  recurring: {
    cadence: FinanceRecurringCadence;
    nextReminderAt: string | null;
  };

  receiptUrl: string | null;

  clientId: string | null;
  clientLabel: string | null;
  projectId: string | null;
  projectLabel: string | null;
  invoiceId: string | null;

  source: FinanceSource;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ────────────────────────────────────────────────────────────
// Invoice
// ────────────────────────────────────────────────────────────

export interface InvoiceLineItemRow {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceRow {
  id: string;
  number: string;
  prefix: string;
  sequence: number;

  clientId: string;
  clientLabel: string | null;
  projectId: string | null;
  projectLabel: string | null;
  subscriptionId: string | null;

  status: InvoiceStatus;

  issueDate: string;
  dueDate: string;
  sentAt: string | null;
  viewedAt: string | null;
  paidDate: string | null;
  voidedAt: string | null;

  items: InvoiceLineItemRow[];

  taxRateOverride: number | null;

  subtotal: number;
  tax: number;
  total: number;
  currency: Currency;
  totalUsd: number;
  exchangeRate: number;
  rateDate: string;

  notes: string | null;
  terms: string | null;

  shareToken: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ────────────────────────────────────────────────────────────
// Subscription
// ────────────────────────────────────────────────────────────

export interface SubscriptionRow {
  id: string;

  clientId: string;
  clientLabel: string | null;

  name: string;
  status: SubscriptionStatus;

  amount: number;
  currency: Currency;
  amountUsd: number;
  exchangeRate: number;
  rateDate: string;

  cycle: SubscriptionCycle;
  startedAt: string;
  nextBillingAt: string;
  lastBilledAt: string | null;
  cancelledAt: string | null;
  pausedAt: string | null;

  autoInvoice: boolean;
  noteForInvoice: string | null;

  createdAt: string;
  updatedAt: string;
}

// ────────────────────────────────────────────────────────────
// Overview KPIs
// ────────────────────────────────────────────────────────────

export interface MoneyOverview {
  /** USD-normalised. */
  monthIncome: number;
  monthExpense: number;
  monthNet: number;

  outstandingInvoicesUsd: number;
  outstandingInvoicesCount: number;

  retainerMrrUsd: number;

  /** 6-month series, oldest → newest. */
  series: { label: string; income: number; expense: number }[];
}
