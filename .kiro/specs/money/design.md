# Money Module — Design

> Technical companion to `requirements.md`. Locks the data model, page
> layout, server actions, sub-phase order, and edge-case handling for
> the unified Money module.

---

## 1. Architectural snapshot

```
┌─────────────────────────────────────────────────────────┐
│  /money                       (parent route, tabs)      │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Overview │ Ledger │ Invoices │ Subs │ Reports │    │
│  └─────────────────────────────────────────────────┘    │
│         │       │         │        │       │           │
│         ▼       ▼         ▼        ▼       ▼           │
│   ┌──────────┐ ┌──────┐ ┌──────┐ ┌────┐ ┌──────┐        │
│   │ overview │ │ledger│ │invoic│ │subs│ │report│        │
│   └────┬─────┘ └──┬───┘ └──┬───┘ └─┬──┘ └──┬───┘        │
└────────┼──────────┼────────┼───────┼───────┼────────────┘
         ▼          ▼        ▼       ▼       ▼
  ┌──────────────────────────────────────────────┐
  │  features/money/  (queries, actions, types)  │
  └──────────────────────────────────────────────┘
                       │
                       ▼
          ┌─────────────────────────────────┐
          │  lib/db/models/  (Mongoose)     │
          │  ▶ FinanceEntry                  │
          │  ▶ Invoice                       │
          │  ▶ InvoiceLineItem (embedded)    │
          │  ▶ Subscription                  │
          │  ▶ NumberSequence                │
          │  ▶ Activity (re-uses existing)   │
          └─────────────────────────────────┘
                       │
                       ▼
            lib/currency/* (Phase 5 layer — unchanged)
```

The module is one App Router segment (`/money`) with a parent layout
that hosts the tab nav. Each tab is its own server component plus a
matching client orchestrator. Server actions live in
`features/money/{ledger,invoices,subscriptions,reports}/actions.ts` and
share validators from `features/money/schemas.ts`.

The existing Phase 4a sidebar already has a `groupMoney` group. Phase 8
collapses **Finance / Invoices / Subscriptions** into a single "Money"
entry. The four old stub pages get deleted.

---

## 2. Data model

All collections sit under the active organization and carry the
standard envelope (`organizationId`, `createdAt`, `updatedAt`,
`deletedAt`, `createdBy`).

### 2.1 `FinanceEntry`

Locked five-field money snapshot, plus business fields. New fields
introduced this phase are tagged `[NEW]`.

```ts
{
  organizationId: ObjectId,
  kind: "income" | "expense",
  category: string,                 // free-form, surfaced as a typeahead

  // Money snapshot (Phase 5 contract)
  amount: number,
  currency: "USD" | "BDT",
  amountUsd: number,
  exchangeRate: number,
  rateDate: string,                 // yyyy-mm-dd

  occurredOn: Date,                 // user-controlled, not createdAt
  description?: string,

  taxDeductible: boolean,           // [NEW]
  taxCategory?: string,             // [NEW]   free-form, e.g. "Office", "Travel"

  recurring: {                      // [NEW]   reminder-only — never auto-posts
    cadence: "none" | "monthly" | "yearly",
    nextReminderAt?: Date,
  },

  receiptUrl?: string,              // [NEW]   placeholder until R2 wiring

  // Linkage (all optional, all single)
  clientId?: ObjectId,
  projectId?: ObjectId,
  invoiceId?: ObjectId,             // present iff this row was auto-synced

  source: "manual" | "invoice",     // [NEW]   guards edit/delete on synced rows
  createdBy: ObjectId,
  deletedAt?: Date,
}
```

**Indexes:**
- `(organizationId, occurredOn -1)` — primary list view
- `(organizationId, kind, occurredOn -1)` — kind-filtered totals
- `(organizationId, invoiceId)` sparse — fast lookup for sync/void
- `(organizationId, clientId, kind)` sparse — client revenue cache
- `(organizationId, recurring.cadence)` sparse — reminder list

**Edit/delete rules:**
- `source === "invoice"` → both blocked. UI surfaces a tooltip pointing
  to the invoice.
- `source === "manual"` → editable by Admin+; Manager read-only.

### 2.2 `Invoice`

```ts
{
  organizationId: ObjectId,
  number: string,                  // "INV-0001" — see §2.5
  prefix: string,                  // snapshot of org's prefix at issue time
  sequence: number,                // numeric only, drives `number`

  clientId: ObjectId,
  projectId?: ObjectId,
  subscriptionId?: ObjectId,       // [NEW]  set when auto-spawned

  status: "draft" | "sent" | "viewed" | "paid" | "void",
  // "overdue" is computed at render time from dueDate + status

  issueDate: Date,
  dueDate: Date,
  sentAt?: Date,
  viewedAt?: Date,
  paidDate?: Date,
  voidedAt?: Date,

  items: InvoiceLineItem[],        // embedded, see §2.3

  // Per-invoice override of org tax rate (null = use workspace value)
  taxRateOverride?: number,        // [NEW]

  // Money snapshot — totals
  subtotal: number,
  tax: number,
  total: number,
  currency: "USD" | "BDT",
  totalUsd: number,
  exchangeRate: number,
  rateDate: string,

  notes?: string,
  terms?: string,

  shareToken: string,              // unique, for /portal/[token]/invoice/[number]
  createdBy: ObjectId,
  deletedAt?: Date,
}
```

**Indexes:**
- `(organizationId, status, issueDate -1)` — primary list
- `(organizationId, number)` unique — lookup by number
- `(organizationId, clientId)` — client invoice list
- `(organizationId, dueDate)` partial `{status: { $in: ["sent","viewed"] }}` — overdue scan
- `(shareToken)` unique — public portal lookup

### 2.3 `InvoiceLineItem` (embedded)

```ts
{
  description: string,
  quantity: number,                 // server-computed, never trusted from client for `lineTotal`
  unitPrice: number,
  lineTotal: number,                // server-computed: quantity × unitPrice
}
```

Line items are **embedded** rather than a separate collection. Most
invoices have < 20 lines and we never query lines independently.

### 2.4 `Subscription`

```ts
{
  organizationId: ObjectId,
  clientId: ObjectId,

  name: string,                     // "Lumen Corp · monthly retainer"
  status: "active" | "paused" | "cancelled",

  // Money snapshot — per-cycle amount
  amount: number,
  currency: "USD" | "BDT",
  amountUsd: number,
  exchangeRate: number,
  rateDate: string,

  cycle: "monthly" | "quarterly" | "yearly",
  startedAt: Date,
  nextBillingAt: Date,              // primary scheduling field
  lastBilledAt?: Date,
  cancelledAt?: Date,
  pausedAt?: Date,

  autoInvoice: boolean,             // default true
  noteForInvoice?: string,          // becomes the line-item description

  createdBy: ObjectId,
  deletedAt?: Date,
}
```

**Indexes:**
- `(organizationId, status)` — list view
- `(organizationId, nextBillingAt)` partial `{ status: "active", autoInvoice: true }` — cron scan
- `(organizationId, clientId)` — per-client subscriptions

### 2.5 `NumberSequence` (gap-free invoice numbering)

```ts
{
  organizationId: ObjectId,
  scope: "invoice",                 // future-proof for proposals etc.
  prefix: string,                   // "INV-" by default; configurable
  next: number,                     // monotonically increasing, never decremented
}
```

**Index:** `(organizationId, scope)` unique.

**Allocation logic:** A `findOneAndUpdate(... $inc: { next: 1 } ...)`
inside a Mongoose transaction returns the new `next` atomically.
Concurrent invoice creates serialise on the upsert. The returned value
becomes the invoice's `sequence`; `number = ${prefix}${pad(sequence, 4)}`.

If the invoice insert later fails, the sequence has already advanced —
that's intentional (we accept potential gaps from rollback rather than
risk duplicates). The "gap-free" requirement targets *concurrent
creation*, not catastrophic failure.

### 2.6 `Organization` additions

Extend the existing model:

```ts
{
  ...existing,
  invoicePrefix: string,            // [NEW]  default "INV-"
  // taxRate already present from Phase 4a
}
```

### 2.7 `Activity` (existing collection — no schema change)

Money mutations write rows with these `verb`s:
`finance.create`, `finance.update`, `finance.delete`,
`invoice.create`, `invoice.send`, `invoice.view`, `invoice.pay`,
`invoice.void`, `subscription.create`, `subscription.pause`,
`subscription.resume`, `subscription.cancel`, `subscription.bill`.

`metadata` always carries `{ amountUsd: number }` for monetary changes.
Status transitions add `{ prevStatus, nextStatus }`.

---

## 3. Routing & layout

```
src/app/[locale]/(app)/money/
├── layout.tsx              // Tab nav + shared header
├── page.tsx                // Overview (default tab)
├── ledger/page.tsx
├── invoices/
│   ├── page.tsx            // List
│   ├── new/page.tsx        // Create form
│   └── [id]/
│       ├── page.tsx        // View / edit
│       └── pdf/page.tsx    // Server-rendered PDF preview (react-pdf)
├── subscriptions/page.tsx
└── reports/page.tsx
```

**Layout component:** `src/components/money/money-layout.tsx`
- Reuses `PageHeader` with eyebrow "Money" and the active tab name.
- Tab strip uses the same horizontal scroll pattern as `SettingsTabs`.
- Server-side gates with `requireOrgContext` + `can.viewFinance(role)`.
- Members redirect to `/dashboard` (architecture rule).

**Sidebar change:** `nav-config.ts` collapses three items into one:

```diff
- finance, invoices, subscriptions   (three separate `groupMoney` items)
+ money    (one entry, points to /money)
```

The legacy stub pages at `/finance`, `/invoices`, `/subscriptions`
become 308 redirects to the matching `/money/*` tab so any old links
still work.

---

## 4. Server actions

All actions live under `src/features/money/{area}/actions.ts` and
follow the established pattern (`"use server"`, `requireOrgContext`,
zod validation, `revalidatePath`, return `ActionResult<T>`).

### 4.1 Ledger

| Action | Role gate | Notes |
|---|---|---|
| `createFinanceEntry` | Admin+ | Auto-snapshots money at write time. |
| `updateFinanceEntry` | Admin+ | Rejects when `source === "invoice"`. |
| `deleteFinanceEntry` | Admin+ | Soft delete via `deletedAt`. |
| `setReminderDismissed` | Admin+ | Dismisses a recurring-expense reminder. |

### 4.2 Invoices

| Action | Role gate | Notes |
|---|---|---|
| `createInvoice` | Admin+ | Allocates number atomically, snapshots totals. |
| `updateInvoiceDraft` | Admin+ | Allowed only when `status === "draft"`. |
| `sendInvoice` | Admin+ | Flips draft → sent, stamps `sentAt`. |
| `markInvoicePaid` | Admin+ | Requires `paidDate`, creates synced FinanceEntry. |
| `markInvoiceUnpaid` | Admin+ | Reverses payment: deletes synced FinanceEntry. |
| `voidInvoice` | Admin+ | Sets status `void`, removes synced FinanceEntry. |
| `regenerateShareToken` | Admin+ | When the original leaks. |

### 4.3 Subscriptions

| Action | Role gate | Notes |
|---|---|---|
| `createSubscription` | Admin+ | Computes initial `nextBillingAt` from `startedAt + cycle`. |
| `updateSubscription` | Admin+ | Block edit of past `lastBilledAt`. |
| `pauseSubscription` | Admin+ | Stamps `pausedAt`. |
| `resumeSubscription` | Admin+ | Recomputes `nextBillingAt = now + cycle`. |
| `cancelSubscription` | Admin+ | Stamps `cancelledAt`; existing invoices untouched. |

### 4.4 Reports & exports

| Action | Role gate | Notes |
|---|---|---|
| `exportLedgerCsv` | Admin+ | Streams a CSV — never holds the full set in memory. |
| `exportPnlPdf` | Admin+ | Server route renders react-pdf; download via signed URL. |

### 4.5 Cron — recurring billing

Path: `/api/cron/billing/route.ts`
Schedule: `vercel.json` cron `0 5 * * *` (05:00 UTC daily).
Auth: shared `CRON_SECRET` Bearer header (same pattern as
`/api/cron/exchange-rates`).

**Algorithm:**
1. Find all `Subscription` docs where:
   - `status === "active"`
   - `autoInvoice === true`
   - `nextBillingAt <= now`
   - `deletedAt === null`
2. For each, in order:
   1. Begin a session.
   2. Allocate an invoice `number` from `NumberSequence`.
   3. Create a `draft` invoice with one line item using the
      subscription's amount/currency.
   4. Stamp the new invoice with `subscriptionId`.
   5. On the subscription, set `lastBilledAt = now`, advance
      `nextBillingAt` by the cycle, leave `status` alone.
   6. Write `Activity` row `subscription.bill`.
   7. Commit.
3. If a subscription's billing fails, log to console + continue with
   the rest (it'll retry tomorrow).

The cron creates **draft** invoices, not sent. The user reviews and
hits "Send" manually — preserves human checkpoint while removing the
"forgot to bill" risk.

---

## 5. UI components

Shared building blocks added or reused:

```
src/components/money/
├── money-layout.tsx              // Tab strip + page chrome
├── money-tabs.tsx                // Client-side tab nav
├── stat-tile.tsx                 // KPI rendering (extracted from dashboard)
├── kind-badge.tsx                // income / expense pill
├── status-badge-invoice.tsx
├── status-badge-subscription.tsx
├── ledger/
│   ├── ledger-table.tsx          // virtual-list-friendly
│   ├── ledger-toolbar.tsx
│   ├── ledger-form-dialog.tsx
│   ├── new-entry-button.tsx
│   └── recurring-reminder-card.tsx
├── invoices/
│   ├── invoices-table.tsx
│   ├── invoices-toolbar.tsx
│   ├── invoice-form.tsx          // Standalone page form, not a dialog
│   ├── invoice-line-items-editor.tsx
│   ├── invoice-detail.tsx
│   ├── invoice-pdf-document.tsx  // react-pdf
│   └── new-invoice-button.tsx
├── subscriptions/
│   ├── subscriptions-table.tsx
│   ├── subscription-form-dialog.tsx
│   └── new-subscription-button.tsx
└── reports/
    ├── pnl-summary.tsx
    ├── cashflow-chart.tsx        // recharts
    ├── category-breakdown.tsx
    └── export-actions.tsx
```

**Deletions:**
- `app/[locale]/(app)/finance/page.tsx`        → replaced by redirect
- `app/[locale]/(app)/invoices/page.tsx`        → replaced by redirect
- `app/[locale]/(app)/subscriptions/page.tsx`   → replaced by redirect

---

## 6. Currency handling

Reuses the Phase 5 contract verbatim:

- `snapshotMoney(input)` — every write goes through this.
- `Money` component — every read renders through this.
- Aggregations sum `amountUsd` only.

**Stale rate gate:** If
`getLatestRates().date < now - 7 days`, the system still serves the
fallback but `Money` adds a "stale" affordance to its tooltip. The
fallback rates from `lib/currency/convert.ts` keep the form usable
when the exchange-rate API is down.

---

## 7. Permissions matrix (final)

| Action | Owner | Admin | Manager | Member |
|---|:-:|:-:|:-:|:-:|
| Open `/money/*` | ✅ | ✅ | ✅ | ❌ |
| Create finance entry | ✅ | ✅ | ❌ | ❌ |
| Edit / delete finance entry | ✅ | ✅ | ❌ | ❌ |
| Create / edit / send invoice | ✅ | ✅ | ❌ | ❌ |
| Mark invoice paid / void | ✅ | ✅ | ❌ | ❌ |
| Create / edit subscription | ✅ | ✅ | ❌ | ❌ |
| Cancel subscription | ✅ | ✅ | ❌ | ❌ |
| Reset all ledger (destructive) | ✅ | ❌ | ❌ | ❌ |
| Export CSV / PDF | ✅ | ✅ | ✅ (PDF only, view-side) | ❌ |
| Edit `Organization.invoicePrefix` | ✅ | ✅ | ❌ | ❌ |

Server-side enforcement is `assertRole("admin")` for write actions,
`can.viewFinance(role)` for read paths. Owner-only actions get an
explicit `role === "owner"` guard.

---

## 8. Audit trail

Single helper `recordActivity(...)` in
`src/features/activity/record.ts`:

```ts
await recordActivity({
  organizationId,
  actorId,
  verb: "invoice.send",
  subjectType: "Invoice",
  subjectId: invoiceId,
  metadata: { amountUsd, prevStatus, nextStatus },
});
```

Every Money server action calls it on success. The Activity Feed
module (Phase C / 11) will read from this collection — Money never
queries it back.

---

## 9. Edge cases

1. **Concurrent invoice numbering** — solved by atomic
   `findOneAndUpdate $inc` on `NumberSequence`.
2. **Voiding an invoice with synced FinanceEntry** — soft-delete the
   entry (`deletedAt = now`, `source = "invoice"` retained) so the
   audit trail shows it once existed.
3. **Subscription paused mid-cycle** — `nextBillingAt` doesn't
   advance until resume; we don't generate a back-bill on resume.
4. **Subscription cycle changed mid-stream** — recompute
   `nextBillingAt = lastBilledAt + newCycle` in `updateSubscription`.
   No back-fill or proration in v1.
5. **Cron runs while exchange-rate API is down** — `snapshotMoney`
   uses cached rates from the last successful pull; if even those
   are missing, it falls through to the hardcoded fallbacks. The
   subscription cron logs a warning and continues.
6. **Workspace `taxRate` changed after invoices were issued** — old
   invoices keep their stamped `tax` amount. New invoices use the
   current rate. Per-invoice override remains the escape hatch.
7. **Display currency switched after entries logged** — only display
   re-rendering happens; stored `amountUsd` is never recomputed. The
   `Money` tooltip continues to show the original entered amount.
8. **Member directly types `/money` URL** — server layout redirects
   to `/dashboard` before any data loads.
9. **Manager attempts a write via direct server action call** —
   `assertRole("admin")` throws, action returns
   `{ ok: false, error: "Forbidden" }`. UI never renders the trigger
   in the first place.
10. **Invoice deletion vs. void** — we don't expose hard delete.
    Void is the only terminal "remove" path.

---

## 10. Sub-phase plan

Five sub-phases mirror the page structure. Each ends with a clean
build, dev server reload, commit, and a feedback checkpoint.

| Sub-phase | Scope | Files (approx) | Time |
|---|---|---|---|
| **8a — Foundation + Layout** | Models (FinanceEntry, Invoice, Subscription, NumberSequence), schemas, currency snapshot wiring, sidebar consolidation, `/money` parent route, Overview tab with KPI tiles using **demo data**. Sidebar + nav rename. Stub redirects from old `/finance`, `/invoices`, `/subscriptions`. Translations. | ~15 | 1 session |
| **8b — Ledger** | FinanceEntry CRUD, ledger table with filters, form dialog, recurring reminder cards. Replace Overview demo data with real reads. | ~10 | 1 session |
| **8c — Invoices** | Invoice CRUD, line-item editor, status workflow, share token, PDF rendering, mark-paid sync to ledger. New `/money/invoices/new` and `/money/invoices/[id]` pages. | ~14 | 1.5 sessions |
| **8d — Subscriptions + auto-billing** | Subscription CRUD, list table, cron route + `vercel.json` entry. End-to-end: create sub → cron runs → draft invoice appears → send → pay. | ~9 | 1 session |
| **8e — Reports + exports + polish** | P&L summary, 12-month cashflow chart, category breakdown, CSV export, P&L PDF. Final accessibility pass. | ~8 | 1 session |

After 8a's commit, the user can already see "Money → Overview" with
demo numbers. After 8b they have a working ledger. After 8c they can
issue real invoices. After 8d the retainer flow auto-runs. After 8e
the module is feature-complete.

Each sub-phase keeps the typecheck green, the production build green,
and ships its own translations (en + bn) before moving on.

---

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Mongoose transactions need a replica set; Atlas free tier supports it but cold starts are slow. | Wrap NumberSequence allocation in a single `findOneAndUpdate` (no multi-doc transaction needed). Cron uses session+commit only when both an invoice insert and subscription update happen together. |
| react-pdf can be slow on cold serverless. | Render PDFs in `nodejs` runtime, not edge. Cache rendered URLs for 5 minutes. Defer streaming/font subsetting until perf becomes a real complaint. |
| Stale `exchangeRate` after long offline periods. | Already handled via fallbacks (Phase 5). Add a "stale rate" badge in the Money component (Phase 8a). |
| Sidebar URL changes break existing bookmarks for early-access users. | Keep three 308 redirects (`/finance` → `/money`, `/invoices` → `/money/invoices`, `/subscriptions` → `/money/subscriptions`). |
| Designers / juniors accidentally see invoice values via direct API hits. | Action-level `assertRole`. Server layout-level redirect. No financial data ever sent to a Member's session. |

---

## 12. Out of scope (re-confirmed)

Same list as `requirements.md` §"Out of scope". Nothing has shifted
from requirements review.
