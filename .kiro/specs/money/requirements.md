# Money Module — Requirements

> The "Money" module unifies everything an agency owner cares about
> financially into one coherent surface. Replaces the current scattered
> Finance / Invoices / Subscriptions stubs with a tabbed parent that
> mirrors how Stripe / QuickBooks / Xero think about agency cashflow.

## Introduction

A small studio's owner-admin opens "Money" to answer four questions in
sequence: How is the business doing this month? Who owes me money? What
am I spending on? And which retainers are renewing soon?

A single navigation entry — **Money** — reveals an Overview tab plus
sub-tabs for Ledger, Invoices, Subscriptions, and Reports. Everything is
USD-normalised under the hood (the snapshot pattern locked in Phase 5)
while still letting the user enter and view amounts in BDT or USD.

This module is the agency's primary value lens. Subsequent phases —
Proposals, Knowledge Base, AI surfaces — assume Money is already live
and feed data into it (e.g., accepted proposals can spawn invoices).

## Glossary

- **Finance entry** — a single income or expense ledger row. Manually
  logged or auto-synced from an invoice.
- **Invoice** — a billable document sent to a client. Has a status
  lifecycle (draft → sent → viewed → paid, with overdue / void
  branches).
- **Subscription** — a recurring revenue agreement with a client. May
  spawn invoices automatically on each cycle.
- **Money snapshot** — the locked 5-field record (`amount`, `currency`,
  `amountUsd`, `exchangeRate`, `rateDate`) attached to every monetary
  document.
- **Display currency** — the currency the active workspace prefers when
  rendering aggregated figures. Defaults to the workspace base currency.

## Stakeholder map

| Role | Money access |
|---|---|
| **Owner** | Everything. Including delete and ledger correction. |
| **Admin** | Everything Owner sees, except destructive ledger reset. |
| **Manager** | Read-only across the whole module. Sees Overview, Ledger, Invoices, Subscriptions. Can't create or edit money. |
| **Member** | The Money sidebar entry is hidden. Cannot access any sub-page. |

The visibility rules from `ARCHITECTURE.md` §3.3 are the source of truth
— anything new added here defers to those.

---

## Requirement 1 — Money landing page (Overview)

**User story:** As an Owner, I want to open Money and see the
month-to-date pulse of the business at a glance, so I can decide where
to drill in.

### Acceptance criteria

1. **WHEN** an Owner / Admin / Manager visits `/money` **THEN** the
   system **SHALL** render the Overview tab as the default view.
2. **WHEN** the Overview tab loads **THEN** the system **SHALL** show
   five KPI tiles: Net (this month), Income (this month), Expenses
   (this month), Outstanding invoices, Retainer MRR.
3. **WHEN** rendering KPI tiles **THEN** the system **SHALL** display
   each tile's primary number in the workspace's display currency, with
   the original entered currency available on hover for non-USD entries.
4. **WHEN** the Overview tab loads **THEN** the system **SHALL** show a
   six-month income vs. expense chart with the current month overlaid.
5. **WHEN** the user has no money records yet **THEN** the system
   **SHALL** show an empty-state with a "Log your first entry" CTA
   instead of empty charts.
6. **WHEN** a Member visits `/money` **THEN** the system **SHALL**
   redirect them to `/dashboard` (the sidebar entry is already hidden).
7. **IF** the latest exchange rate is older than 7 days **THEN** the
   system **SHALL** still display all figures but **SHALL** mark the
   conversion as "stale rate" in the rate-date tooltip.

---

## Requirement 2 — Ledger (income + expenses)

**User story:** As an Admin, I want to log income and expense entries
in one ledger so that my P&L stays accurate without juggling
spreadsheets.

### Acceptance criteria

1. **WHEN** an Admin visits the Ledger tab **THEN** the system
   **SHALL** display all finance entries in reverse chronological order
   by `occurredOn`.
2. **WHEN** an Admin creates a finance entry **THEN** the system
   **SHALL** require `kind` (income | expense), `amount`, `currency`,
   `category`, and `occurredOn`.
3. **WHEN** an entry is created **THEN** the system **SHALL** stamp the
   full money snapshot (amount, currency, amountUsd, exchangeRate,
   rateDate) at write time and **SHALL** never recompute the snapshot
   afterwards.
4. **WHEN** an entry is linked to a `clientId` and that client's
   pipeline is updated **THEN** the system **SHALL** refresh the
   client's `totalRevenueUsd` cache (income only).
5. **WHEN** an entry's `description` starts with `[invoice:<id>]`
   **THEN** the system **SHALL** treat it as auto-synced and **SHALL**
   block manual edit/delete on that row (the source invoice is the
   editable representation).
6. **WHEN** an Admin filters the ledger by date range / kind /
   category / client / project **THEN** the system **SHALL** apply
   filters in the URL query params and recompute the visible totals.
7. **IF** an entry is marked `taxDeductible: true` **THEN** the system
   **SHALL** include it in the deductible total shown on the Reports
   tab.
8. **WHEN** an Admin marks an entry recurring (monthly | yearly)
   **THEN** the system **SHALL** record the cadence but **SHALL NOT**
   auto-create future entries from this surface (recurring revenue is
   a Subscription's job; recurring expenses are surfaced as a
   reminder, not auto-posted).
9. **WHEN** a Manager opens the Ledger **THEN** the system **SHALL**
   render every row read-only, no edit/delete actions visible.
10. **WHEN** an entry has a receipt file **THEN** the system **SHALL**
    show a paper-clip icon. Clicking opens the receipt (R2 wiring
    arrives in a later phase — until then, the field accepts a URL).

---

## Requirement 3 — Invoice creation and lifecycle

**User story:** As an Admin, I want to issue an invoice to a client
with line items and tax, so I can collect payment and have a record
the system can sync to the ledger.

### Acceptance criteria

1. **WHEN** an Admin clicks "New invoice" **THEN** the system **SHALL**
   open a form requiring `clientId`, at least one line item, and an
   `issueDate`.
2. **WHEN** an invoice is created **THEN** the system **SHALL** assign
   it a sequential, gap-free `number` scoped to the organization
   (format: `INV-0001`, configurable prefix per workspace later).
3. **WHEN** a line item has `quantity` and `unitPrice` **THEN** the
   system **SHALL** compute `lineTotal = quantity × unitPrice` server-side
   and **SHALL NOT** trust client-submitted line totals.
4. **WHEN** an invoice subtotal is computed **THEN** the system
   **SHALL** apply tax at the workspace's configured `taxRate` to
   produce the final `total`.
5. **WHEN** an invoice is in `draft` status **THEN** the system
   **SHALL** allow editing of every field.
6. **WHEN** an invoice transitions to `sent` (or any later status)
   **THEN** the system **SHALL** lock line items and dates from edit;
   only status, payment date, and notes remain mutable.
7. **WHEN** an invoice's status changes to `sent` **THEN** the system
   **SHALL** stamp `sentAt`.
8. **WHEN** an invoice is viewed via its public share token (Phase 10)
   **THEN** the system **SHALL** stamp `viewedAt` exactly once and
   **SHALL** auto-transition `sent` → `viewed`.
9. **WHEN** an Admin marks an invoice paid **THEN** the system
   **SHALL** require `paidDate` and **SHALL** create a corresponding
   income FinanceEntry tagged `[invoice:<id>]`.
10. **WHEN** an invoice's `dueDate` passes and status is `sent` or
    `viewed` **THEN** the system **SHALL** display its status as
    `overdue` (computed at render time — no stored status flip
    required, but the badge styling reflects it).
11. **WHEN** an Admin voids an invoice **THEN** the system **SHALL**
    set status to `void` and **SHALL** delete (or zero-out) any synced
    FinanceEntry to keep the ledger honest.
12. **WHEN** the workspace's base currency differs from the invoice
    currency **THEN** the system **SHALL** snapshot the invoice
    `total` to USD at issue time and persist all five money fields.
13. **WHEN** an Admin downloads an invoice as PDF **THEN** the system
    **SHALL** render a branded PDF using the workspace's name, logo,
    accent color, and tax rate.

---

## Requirement 4 — Recurring invoices via Subscriptions

**User story:** As an Owner, I want monthly retainer clients to
auto-generate invoices on their billing date so I don't forget to
bill them and revenue tracking stays clean.

### Acceptance criteria

1. **WHEN** an Admin creates a Subscription **THEN** the system
   **SHALL** require `clientId`, `name`, `amount`, `currency`,
   `cycle` (monthly | quarterly | yearly), `startedAt`, and
   `autoInvoice` (boolean, default true).
2. **WHEN** a Subscription's `nextBillingAt` is reached **AND**
   `autoInvoice` is true **THEN** the system **SHALL** create a draft
   invoice for that client with one line item matching the
   Subscription's amount.
3. **WHEN** an auto-generated invoice is created from a Subscription
   **THEN** the system **SHALL** stamp the invoice with a reference
   back to the source `subscriptionId`.
4. **WHEN** a Subscription's `cycle` is `monthly` **THEN** the system
   **SHALL** advance `nextBillingAt` by one calendar month after each
   billing event.
5. **WHEN** a Subscription is `paused` **THEN** the system **SHALL**
   skip the next billing cycle but **SHALL NOT** advance
   `nextBillingAt` until resumed.
6. **WHEN** a Subscription is `cancelled` **THEN** the system
   **SHALL** stamp `cancelledAt` and **SHALL NOT** generate further
   invoices, but historical invoices linked to it **SHALL** remain
   intact.
7. **WHEN** the Subscriptions tab loads **THEN** the system **SHALL**
   show MRR (USD-normalised) and ARR alongside the list.
8. **WHEN** a Manager views Subscriptions **THEN** the system **SHALL**
   render read-only.

> Auto-billing runs on a Vercel Cron route (similar pattern to the
> existing exchange-rates cron). Implementation detail belongs in
> `design.md` — this requirement only stipulates the behaviour.

---

## Requirement 5 — P&L and cashflow reports

**User story:** As an Owner, I want to see profit & loss and
month-by-month cashflow so I can plan tax payments and growth.

### Acceptance criteria

1. **WHEN** an Owner opens the Reports tab **THEN** the system
   **SHALL** show the current quarter's P&L: revenue, expenses (by
   category), net profit, all USD-normalised.
2. **WHEN** the Reports tab loads **THEN** the system **SHALL** show a
   12-month cashflow chart with a moving-average overlay.
3. **WHEN** the Owner picks a custom date range **THEN** the system
   **SHALL** recompute every metric on that range without page reload.
4. **WHEN** the Reports tab is rendered **THEN** the system **SHALL**
   show the tax-deductible total separately from the all-expenses
   total.
5. **WHEN** the Owner clicks "Export CSV" **THEN** the system
   **SHALL** download a CSV with one row per finance entry in the
   selected range, including all five money snapshot fields.
6. **WHEN** the Owner clicks "Export PDF" **THEN** the system
   **SHALL** download a branded P&L summary PDF.
7. **IF** the date range spans multiple exchange-rate dates **THEN**
   the system **SHALL** aggregate on the stored `amountUsd` field, not
   re-convert at report time.

---

## Requirement 6 — Permissions and visibility

**User story:** As an Owner, I want my Member-level teammates to never
see financial figures so junior staff can collaborate on projects
without seeing salaries or revenue.

### Acceptance criteria

1. **WHEN** a Member's session is active **THEN** the system **SHALL**
   omit the "Money" sidebar entry entirely.
2. **WHEN** a Member directly navigates to `/money` or any sub-tab
   **THEN** the system **SHALL** redirect to `/dashboard`.
3. **WHEN** a Manager performs any write action (create, edit, delete)
   **THEN** the system **SHALL** reject the action server-side via
   `assertRole("admin")` regardless of UI state.
4. **WHEN** an Admin attempts the destructive "Reset all ledger"
   action **THEN** the system **SHALL** require Owner role and a
   typed-email confirmation.
5. **WHEN** any money mutation succeeds **THEN** the system **SHALL**
   write an Activity row capturing actor, verb, subject, USD value
   (for audit and the future Activity Feed module).

---

## Requirement 7 — Currency and locale

**User story:** As an Owner whose retainers are in BDT and one-off
projects in USD, I want amounts to render in their entered currency by
default while reports still aggregate to a single base.

### Acceptance criteria

1. **WHEN** an entry is shown in any list / table / card **THEN** the
   system **SHALL** display the `amount` and `currency` as entered.
2. **WHEN** the workspace's `baseCurrency` differs from the entry's
   currency **THEN** the system **SHALL** show the USD-equivalent in
   a tooltip with the rate date.
3. **WHEN** any aggregate (sum, MRR, KPI) is computed **THEN** the
   system **SHALL** sum on `amountUsd` only.
4. **WHEN** the workspace switches its `baseCurrency` from USD to BDT
   (or vice versa) **THEN** the system **SHALL NOT** recompute any
   stored snapshot — only the *display* currency for aggregates flips.
5. **WHEN** a finance form is opened **THEN** the system **SHALL**
   default the currency to the workspace's `baseCurrency`.
6. **WHEN** the locale is `bn` **THEN** the system **SHALL** still
   render numerals as Western digits (per the architecture's locked
   numeral rule), only currency symbol and labels translate.

---

## Requirement 8 — Activity, audit, and integrity

**User story:** As an Owner, I want every money mutation to leave a
trail so I can investigate later if something looks off.

### Acceptance criteria

1. **WHEN** any FinanceEntry, Invoice, or Subscription is created /
   updated / deleted / status-changed **THEN** the system **SHALL**
   write an `Activity` document with `verb`, `actorId`, `subjectType`,
   `subjectId`, `metadata { amountUsd, prevStatus?, nextStatus? }`.
2. **WHEN** the Reports tab is loaded **THEN** the system **SHALL NOT**
   read from the activity log — it's append-only audit, not a query
   source.
3. **WHEN** an invoice is voided **THEN** the system **SHALL** preserve
   the original line items as immutable history, only flipping `status`
   and removing the synced FinanceEntry.
4. **WHEN** a deleted FinanceEntry is restored (Phase later) **THEN**
   the system **SHALL** keep its original `_id`, dates, and snapshot
   intact.

---

## Out of scope (this module)

These belong in their own specs and are explicitly **not** part of the
Money module:

- **Time tracking** and **timesheets** — postponed indefinitely per
  user decision.
- **Payment gateway integration** (Stripe / Wise / SSLCommerz) — phase
  D / integrations.
- **Receipt OCR** — Phase C, advanced expenses.
- **Forecasting / cashflow projections** beyond a 12-month historical
  chart.
- **Multi-currency wallets per client** — single currency per record
  is enough for v1.
- **Approval workflows** for expenses (manager approves before it
  lands in the ledger). Future enhancement.
- **Direct bank-feed import** — out of scope.

---

## Locked decisions

These were the open product questions before design. All seven landed
on the recommended default (per user, "go with recommended"):

1. **Invoice numbering** — gap-free per organization, format
   `INV-0001`. The prefix is configurable from workspace settings.
2. **Tax model** — single workspace-level `taxRate` is the default;
   each invoice carries an optional per-invoice override field. No
   per-line-item tax in v1.
3. **Recurring expenses** — reminder badge only. The system surfaces
   a "due to log" hint on the Ledger but never auto-posts an expense.
4. **Partial payments** — not in v1. Invoices flip from
   `sent`/`viewed`/`overdue` straight to `paid`. Partial-payment
   splits are deferred to a later phase.
5. **Display currency** — workspace-level only (`Organization.baseCurrency`).
   Per-user display preference is deferred.
6. **Sidebar label** — "Money" stays as the parent label.
7. **PDF templates** — one fixed, well-designed template per document
   type (invoice, P&L). No template picker in v1.

All seven feed directly into `design.md` — no further decisions needed
before drafting it.
