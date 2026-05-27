# Money Module — Tasks

> Concrete checklist that maps to `design.md`. Items are ordered by
> sub-phase. Each top-level item ends with the affected file paths in
> parentheses so reviewers can sanity-check the diff scope.

---

## Sub-phase 8a — Foundation + Layout (Overview with demo data)

- [ ] **Scaffold module folder + types** — create
  `src/features/money/{schemas,types}.ts` with the shared zod schemas
  and TypeScript types referenced from §2 of the design doc.
- [ ] **Mongoose models** — add the four new collections (no
  invoice/subscription logic yet, just the schema):
  - `src/lib/db/models/finance-entry.ts`
  - `src/lib/db/models/invoice.ts` + embedded `InvoiceLineItem`
  - `src/lib/db/models/subscription.ts`
  - `src/lib/db/models/number-sequence.ts`
  - Re-export from `src/lib/db/models/index.ts`.
- [ ] **Organization schema** — add `invoicePrefix` (default `"INV-"`)
  to `src/lib/db/models/organization.ts`. Backfill on read with the
  default for any existing orgs.
- [ ] **Sidebar consolidation** — collapse Finance / Invoices /
  Subscriptions into a single "Money" item in
  `src/components/layout/nav-config.ts`. Drop the legacy entries.
- [ ] **Legacy redirects** — three 308 redirect routes so old links
  still resolve:
  - `/finance` → `/money`
  - `/invoices` → `/money/invoices`
  - `/subscriptions` → `/money/subscriptions`
  Implementation: tiny `route.ts` files under each old path that issue
  the redirect, OR a `next.config.ts` `redirects()` block (prefer the
  config-level approach for clarity).
- [ ] **Money parent layout** — `src/app/[locale]/(app)/money/layout.tsx`
  with the tab strip, role gate, and shared header. Members redirect
  to `/dashboard` server-side.
- [ ] **Overview page (demo data)** —
  `src/app/[locale]/(app)/money/page.tsx` rendering 5 KPI tiles + a
  6-month income/expense chart. Demo data lives in
  `src/features/money/overview/demo-data.ts`. **No Mongo reads in
  8a.**
- [ ] **Stub pages for the other tabs** — Ledger / Invoices /
  Subscriptions / Reports each render a "Coming next sub-phase"
  card so the tab strip works end-to-end.
- [ ] **Money components** — extract the KPI tile and a money-status
  badge primitive into `src/components/money/*` so 8b–8e can reuse
  them.
- [ ] **Translations** — add the full `Money` namespace to
  `messages/en.json` and `messages/bn.json` (Overview, tab labels,
  empty states, common labels).
- [ ] **Stale-rate affordance** — extend `Money` component to surface
  a "stale rate" hint when `rateDate` is older than 7 days (used
  later by every monetary read).
- [ ] **Verify** — `npx tsc --noEmit` clean, `npm run build` clean,
  dev server boots, `/money` renders, `/finance` redirects,
  `/invoices` redirects, `/subscriptions` redirects, locale switcher
  works on the new tab.
- [ ] **Commit** — single "Main Commits" + push.

---

## Sub-phase 8b — Ledger

- [ ] Server actions in `src/features/money/ledger/actions.ts`:
  `createFinanceEntry`, `updateFinanceEntry`,
  `deleteFinanceEntry`, `setReminderDismissed`. All with
  `assertRole("admin")`.
- [ ] Queries in `src/features/money/ledger/queries.ts`:
  `listFinanceEntries(filters)`, `getFinanceStats(range)`,
  `listRecurringReminders(now)`.
- [ ] Filter state on `LedgerToolbar`: date range, kind, category,
  client, project. URL-synced.
- [ ] `LedgerTable` with virtualised rendering for orgs that hit
  thousands of rows (use a simple windowed list, not a heavy lib).
- [ ] `LedgerFormDialog` — handles both create and edit. Edit blocked
  when `source === "invoice"` (UI tooltip + server action also rejects).
- [ ] `RecurringReminderCard` surfaces this month's "due to log"
  reminders at the top of the ledger.
- [ ] Replace Overview demo data with real reads from
  `getFinanceStats`.
- [ ] Activity rows on every mutation (`recordActivity`).
- [ ] Translations — extend `Money.ledger.*`.
- [ ] Verify + commit.

---

## Sub-phase 8c — Invoices

- [ ] `NumberSequence` allocator helper in
  `src/features/money/invoices/numbering.ts`.
- [ ] Invoice CRUD actions:
  `createInvoice`, `updateInvoiceDraft`, `sendInvoice`,
  `markInvoicePaid`, `markInvoiceUnpaid`, `voidInvoice`,
  `regenerateShareToken`.
- [ ] Invoice queries: `listInvoices(filters)`, `getInvoiceById`,
  `getInvoiceByShareToken` (used by Phase 10 portal — implement now,
  consume later).
- [ ] `/money/invoices/new` standalone page (line-item editor lives
  here, not in a dialog — too much surface for a modal).
- [ ] `/money/invoices/[id]` detail page with status timeline,
  send / mark-paid / void actions, side panel showing the synced
  ledger entry.
- [ ] `InvoicePdfDocument` rendered via `@react-pdf/renderer` at
  `/money/invoices/[id]/pdf` — Node runtime route handler.
- [ ] Sync ledger on `markInvoicePaid` (insert FinanceEntry with
  `source: "invoice"`).
- [ ] Reverse sync on `markInvoiceUnpaid` and `voidInvoice` (soft
  delete the synced entry).
- [ ] Status badge that computes "overdue" at render from
  `dueDate` + `status`.
- [ ] Translations — extend `Money.invoices.*`.
- [ ] Verify + commit.

---

## Sub-phase 8d — Subscriptions + auto-billing

- [ ] Subscription CRUD actions:
  `createSubscription`, `updateSubscription`, `pauseSubscription`,
  `resumeSubscription`, `cancelSubscription`.
- [ ] Subscription queries: `listSubscriptions`, `getMrrSnapshot`.
- [ ] `SubscriptionFormDialog` + table.
- [ ] Cron route `src/app/api/cron/billing/route.ts`:
  - Bearer-token gate via `CRON_SECRET`.
  - Per-subscription transactional flow (allocate number, create
    draft invoice, advance `nextBillingAt`, write Activity).
  - Idempotent: re-running the same UTC day must not double-bill.
- [ ] `vercel.json` — add the daily cron entry alongside the existing
  exchange-rate one.
- [ ] Manual-trigger button on Subscriptions page (Owner only) for
  testing the cron locally without waiting.
- [ ] Translations — extend `Money.subscriptions.*`.
- [ ] Verify + commit.

---

## Sub-phase 8e — Reports + exports + polish

- [ ] `getQuarterlyPnl(range)` query.
- [ ] `getCashflowSeries(months)` query — 12-month income/expense
  series + 3-month moving average.
- [ ] `PnlSummary`, `CashflowChart`, `CategoryBreakdown` components.
- [ ] `exportLedgerCsv` server action — streams CSV via `Response`,
  doesn't buffer the full set.
- [ ] `exportPnlPdf` route (`/api/money/reports/pnl/pdf`) using
  `@react-pdf/renderer`.
- [ ] Date-range picker that reuses the one we built for Phase 4a's
  workspace settings (lift it into `src/components/ui/date-range-picker.tsx`).
- [ ] Accessibility audit on the whole module (focus rings, form
  labels, table semantics, keyboard navigation across tabs).
- [ ] Final translations sweep — make sure no key is referenced
  without a value in either locale.
- [ ] Verify + commit.
