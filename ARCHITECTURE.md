# Injaazh OS — Architecture

> Source of truth for product, data, and engineering decisions.
> Every section here is **locked** unless this document is explicitly updated.
> Read this first before resuming work after a context reset.

---

## 1. Product

**What it is:** Multi-user agency operating system. CRM, projects, finance,
proposals, time tracking, AI copilot — for small studios and their teams.

**Tenant model:** Single-agency now, multi-tenant-ready schema (Option C).
- Day 1: One organization (Injaazh's own agency), invitation-only signup.
- All data is scoped by `organizationId` from day one.
- Public signup is gated behind a feature flag — flipping it on later turns
  the product into a SaaS without code rewrites.

**Languages:** English (default) and Bengali. Western numerals in both.
**Currencies:** BDT and USD with live exchange rate conversion.

---

## 2. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack dev) |
| UI runtime | React 19 |
| Styling | Tailwind CSS v4 (CSS-first `@theme`), shadcn/ui (new-york), Radix UI |
| Data | MongoDB Atlas + Mongoose |
| Auth | Auth.js (NextAuth) + Mongo adapter — email/password, Google OAuth, magic link |
| State (server) | TanStack Query v5 |
| State (client) | React Context + URL params |
| i18n | next-intl 3.x (locales: `en`, `bn`) |
| Forms | react-hook-form + zod |
| Animation | Framer Motion 12 (respects `prefers-reduced-motion`) |
| Toasts | Sonner (single toast surface) |
| Rich text | TipTap 3 |
| Charts | Recharts |
| PDF | @react-pdf/renderer |
| File storage | Cloudflare R2 (S3-compatible) |
| Email | Resend |
| AI | Anthropic Claude (primary), OpenAI (fallback) — both server-side |
| Realtime | Polling for now (single agency); upgrade to Pusher if needed |
| Exchange rates | open.er-api.com (free, daily cache) |
| Hosting | Vercel (preferred) |
| Testing | Vitest + Testing Library |

**Removed from legacy stack:** Supabase (DB, auth, storage, edge functions, realtime),
Lovable (visual editor), `react-router-dom` (App Router replaces it), `next-themes`
(custom ThemeContext suffices).

---

## 3. Identity & access

### 3.1 Roles (org-level)

| Role | Capabilities |
|---|---|
| **Owner** | Everything. Billing. Org transfer. Exactly one per org. |
| **Admin** | Manage members, all settings except billing/transfer, all data. |
| **Manager** | Full access to clients, leads, projects, tasks. Finance is **read-only**. Cannot manage members. |
| **Member** | Sees only assigned projects + tasks. Finance is **hidden**. Cannot see client revenue. |

### 3.2 Project membership

Each project has a separate member list, layered on top of the org role:

| Project role | Capabilities |
|---|---|
| **Lead** | Full control of this project regardless of org role (within limits — finance still gated). |
| **Contributor** | Edit tasks, files, deliverables on this project. |

Effective permission = `max(org-role-permission, project-role-permission)`.

### 3.3 Visibility rules

| Resource | Who can see |
|---|---|
| **Clients** | Manager+. Member sees only clients tied to their assigned projects. |
| **Leads** | Manager+. (Pre-sales — usually senior staff.) |
| **Projects** | Manager+. Member sees only assigned projects. |
| **Tasks** | Project members + assignees. Manager+ sees all. |
| **Finance entries** | Admin+ full. Manager read-only. Member hidden. |
| **Invoices** | Admin+ full. Manager read-only. Member hidden. |
| **Proposals** | Manager+ full. Member read-only on assigned projects. |
| **Subscriptions** | Admin+ full. Manager read-only. Member hidden. |
| **Settings** | Admin+ for workspace settings. Owner-only for billing/transfer. |
| **Team page** | Anyone can view, only Admin+ can invite/remove. |
| **AI Copilot** | All roles. Scope is filtered to whatever the calling user can see. |

### 3.4 Auth flow

- **Sign up** is invite-only by default (feature flag for public signup).
- The first user signing up at the bootstrap creates the organization and is set
  as `Owner`.
- Subsequent users join via `Invitation` records (email-based, single-use, expiring).
- Auth.js handles sessions; the JWT carries `userId`, `orgId`, `role` after the
  user picks an active org (multi-org switching is possible but rare in v1).
- Server actions / API routes always re-derive permission from the database,
  never from the JWT alone.

---

## 4. Data model

All collections include `organizationId`, `createdAt`, `updatedAt`, and where
appropriate `createdBy`. Soft-delete via `deletedAt` on user-facing records.

### 4.1 Identity collections

```
User
  _id, email (unique), name, image, locale ("en"|"bn"),
  themeMode ("dark"|"light"), passwordHash?, emailVerified,
  authProviders [{ provider, providerAccountId }],
  createdAt, updatedAt

Organization
  _id, name, slug (unique), tagline?, logoUrl?,
  accentHsl ("226 100% 65%"),
  baseCurrency ("USD"|"BDT"),
  taxRate (number),
  features { publicSignup, aiCopilot, ... },
  createdAt, updatedAt

OrgMember
  _id, organizationId, userId,
  role ("owner"|"admin"|"manager"|"member"),
  status ("active"|"invited"|"suspended"),
  invitedBy?, joinedAt, createdAt, updatedAt
  // Composite unique index: (organizationId, userId)

Invitation
  _id, organizationId, email, role,
  token (unique, indexed), expiresAt,
  invitedBy, status ("pending"|"accepted"|"revoked"|"expired"),
  acceptedAt?, createdAt
```

### 4.2 Business collections

```
Client
  _id, organizationId, name, company?, email?, phone?,
  status ("active"|"paused"|"archived"),
  tags [string], notes?, totalRevenueUsd (cached),
  portalToken (unique), createdAt, updatedAt

Lead
  _id, organizationId, name, company?, email?, phone?,
  source?, estimatedValueUsd?, currency,
  pipelineStage ("new"|"contacted"|"proposal"|"negotiation"|"won"|"lost"),
  ownerId (assigned user), nextActionAt?, notes?,
  convertedClientId?, createdAt, updatedAt

Project
  _id, organizationId, clientId, name, description?,
  status ("planning"|"in_progress"|"review"|"on_hold"|"completed"|"archived"),
  techStack [string],
  budgetAmount, budgetCurrency, budgetAmountUsd, budgetRate, budgetRateDate,
  billedAmountUsd (cached), startedAt?, dueAt?, completedAt?,
  pinned, createdAt, updatedAt

ProjectMember
  _id, projectId, userId, role ("lead"|"contributor"),
  joinedAt
  // Composite unique: (projectId, userId)

ProjectMilestone
  _id, projectId, name, dueAt?, completedAt?, order

ProjectFile
  _id, projectId, name, r2Key, size, mimeType,
  uploadedBy, createdAt

Deliverable
  _id, projectId, name, description?, dueAt?,
  status ("pending"|"submitted"|"approved"|"changes_requested"),
  fileId?, submittedAt?, approvedAt?, createdAt, updatedAt

Task
  _id, organizationId, projectId?, parentTaskId?,
  title, description?, assigneeId?, createdBy,
  priority ("high"|"medium"|"low"),
  quadrant ("q1"|"q2"|"q3"|"q4"),  // Eisenhower
  workType?, energyLevel?, estimateMinutes?,
  dueAt?, completedAt?, done (bool),
  createdAt, updatedAt

TimeLog
  _id, organizationId, userId, projectId?, taskId?,
  startedAt, endedAt, durationSeconds,
  billable (bool), hourlyRateUsd?,
  description?, createdAt

Timesheet
  _id, organizationId, userId,
  weekStart, weekEnd,
  status ("draft"|"submitted"|"approved"|"rejected"),
  totalSeconds, billableSeconds,
  approvedBy?, approvedAt?, createdAt, updatedAt
```

### 4.3 Money

```
FinanceEntry
  _id, organizationId, kind ("income"|"expense"),
  amount, currency, amountUsd, exchangeRate, rateDate,
  category, taxDeductible (bool), taxCategory?,
  occurredOn (date), description?,
  clientId?, projectId?, invoiceId?,
  recurringFrequency ("none"|"monthly"|"yearly"),
  receiptFileId?, createdBy, createdAt, updatedAt

Invoice
  _id, organizationId, number (sequential per org),
  clientId, projectId?,
  status ("draft"|"sent"|"viewed"|"paid"|"overdue"|"void"),
  issueDate, dueDate, paidDate?,
  items [{ description, quantity, unitPrice, total }],
  subtotal, tax, total,
  currency, totalUsd, exchangeRate, rateDate,
  notes?, terms?, sentAt?,
  createdBy, createdAt, updatedAt

Proposal
  _id, organizationId, clientId,
  title, contentJson (TipTap doc), contentHtml (cached),
  status ("draft"|"sent"|"viewed"|"accepted"|"declined"|"expired"),
  amount, currency, amountUsd, exchangeRate, rateDate,
  shareToken (unique), expiresAt?, viewedAt?, acceptedAt?,
  createdBy, createdAt, updatedAt

Subscription
  _id, organizationId, clientId,
  name, status ("active"|"paused"|"cancelled"),
  amount, currency, amountUsd, exchangeRate, rateDate,
  cycle ("monthly"|"quarterly"|"yearly"),
  startedAt, nextBillingAt, cancelledAt?,
  autoInvoice (bool), createdAt, updatedAt
```

### 4.4 Currency conversion (locked rule)

Every monetary record stores **all five fields**:

```
amount          – the value as the user entered it
currency        – BDT | USD
amountUsd       – converted at entry time using the rate below
exchangeRate    – numeric rate used (e.g., 0.00917 for BDT→USD)
rateDate        – ISO date the rate was fetched
```

- USD entries store `amountUsd === amount` and `exchangeRate === 1`.
- Historical records are **immutable** — rate never re-applied.
- Reports always aggregate on `amountUsd`. Display shows `amount` + `currency`,
  with `amountUsd` shown in a tooltip when the org viewer's preferred currency
  differs.
- Daily refresh: a scheduled task (Vercel Cron or self-managed) hits
  `open.er-api.com/v6/latest/USD` once per 24h, stores rates in
  `ExchangeRate` collection.

```
ExchangeRate
  _id, base ("USD"), date (yyyy-mm-dd, indexed),
  rates { BDT, EUR, GBP, INR, ... },
  source ("open.er-api.com"), fetchedAt
```

### 4.5 Activity, notifications, knowledge

```
Activity
  _id, organizationId, actorId, verb,
  subjectType, subjectId, metadata, createdAt
  // append-only audit trail

Notification
  _id, organizationId, userId,
  type, title, body, link?,
  readAt?, createdAt

Doc            // knowledge base
  _id, organizationId, parentDocId?, title,
  contentJson (TipTap), contentHtml (cached),
  visibility ("public"|"org"|"project"|"private"),
  scopeProjectId?, scopeClientId?,
  createdBy, updatedBy, createdAt, updatedAt

Comment
  _id, organizationId, parentType, parentId,
  authorId, body (markdown), mentions [userId],
  createdAt, updatedAt
```

### 4.6 Indexes (must-have)

- `OrgMember`: `(organizationId, userId)` unique, `(userId)` for "my orgs"
- `Invitation`: `(token)` unique, `(organizationId, email)`
- `Client`: `(organizationId, status, updatedAt -1)`
- `Project`: `(organizationId, status)`, `(organizationId, clientId)`
- `Task`: `(organizationId, assigneeId, done)`, `(projectId, done)`
- `TimeLog`: `(organizationId, userId, startedAt -1)`
- `FinanceEntry`: `(organizationId, occurredOn -1)`, `(organizationId, kind)`
- `Invoice`: `(organizationId, status)`, `(organizationId, number)` unique
- `ExchangeRate`: `(date -1)`

---

## 5. Modules

### 5.1 Phase A — Core (must ship first)

| # | Module | Notes |
|--:|---|---|
| 1 | **Dashboard** | Studio Briefing concept (see §6), role-aware, customizable |
| 2 | **My Work** | Personal inbox: assigned tasks, mentions, deadlines, today's plan |
| 3 | **Clients** | CRM, active relationships only |
| 4 | **Leads** | Pre-sales pipeline, separate from Clients, convertible |
| 5 | **Projects** | Kanban + List + Timeline, file storage, milestones |
| 6 | **Tasks** | Eisenhower 2×2, work types, energy levels |
| 7 | **Time Tracking** | Focus Timer + weekly Timesheets + billable rate |
| 8 | **Finance** | Income/expense ledger, P&L, cash flow, forecast |
| 9 | **Invoices** | Generate, send, track, recurring auto-create |
| 10 | **Proposals** | TipTap editor, AI draft, public share, accept |
| 11 | **Subscriptions** | Retainer/recurring revenue, auto-invoice |
| 12 | **Team** | Members list, role assign, invitations |
| 13 | **Settings** | Workspace, profile, integrations, billing |

### 5.2 Phase B — Public surfaces

| # | Module |
|--:|---|
| 14 | **Client Portal** (token URL, no login) |
| 15 | **Proposal Share** (public proposal viewer) |

### 5.3 Phase C — Advanced (after core stable)

| # | Module |
|--:|---|
| 16 | **Knowledge Base** (internal wiki, project SOPs, TipTap-based) |
| 17 | **Expenses + Receipts** (upload, OCR via AI) |
| 18 | **Reports** (custom builder, schedule export) |
| 19 | **Goals / OKRs** (quarterly, per-team or per-project) |
| 20 | **Team Capacity** (workload heatmap, who's free) |
| 21 | **Notifications Center** (full history) |
| 22 | **Activity Feed** (org-wide audit trail) |

### 5.4 Phase D — Integrations (later)

Slack · GitHub · Google Calendar · Stripe (payments)

---

## 6. Dashboard — Studio Briefing concept

Editorial layout. Wakes you up, tells you what matters today.
Replaces the generic KPI-grid pattern of the legacy dashboard.

### 6.1 Sections (top-to-bottom)

1. **Today's briefing**
   - Big date heading: "Wednesday, May 27"
   - 2–3 lines of AI-generated text scoped to the viewer's role:
     "You have 3 priority tasks. 2 client follow-ups today.
     ৳120k expected this week. Net month-to-date is up 12%."
   - Two CTAs: **Start deep work** (primary) and a **Quick capture** input.

2. **What needs you** — three differently-sized priority cards
   - Top priority task
   - Most urgent deadline
   - Highest pending invoice
   - Each card carries full context (client, project, assignee, due, value).

3. **Two-column row**
   - Left: live revenue chart (6-month area + month-to-date overlay)
   - Right: pulse stack — recent activity feed (compact) + AI insights

4. **Quick stats grid** — 6 small tiles
   - Active clients · Active projects · Billable hours this week
   - Cash position · Retainer MRR · Client satisfaction (NPS placeholder)

5. **Upcoming this week** — horizontal calendar-strip
   - Tasks, deadlines, meetings, invoices due — color-coded by type.

### 6.2 Customization

- Settings → "Customize Dashboard" page.
- Per-user preference (stored on `User.dashboardLayout`).
- Each section can be: shown / hidden / reordered (drag).
- Cannot remove the briefing section — it's the anchor.
- Defaults vary by role:
  - Owner / Admin: all sections, finance prominent.
  - Manager: finance read-only badge, project pulse expanded.
  - Member: briefing + my work + upcoming. No finance, no team pulse.

### 6.3 Briefing AI prompt strategy

The briefing text is generated server-side once per day per user, cached for
24h. Inputs: open tasks, urgent deadlines, finance summary (role-permitted),
recent project activity. Tone is concise, second person, factual.

---

## 7. Design language

### 7.1 Principles

- **Editorial typography first.** Display font (`Space Grotesk`) is reserved
  for hero numbers and section anchors. Body is `Inter`. Bengali falls back to
  `Hind Siliguri`.
- **Gradient is an accent moment.** Not used on every button or card. Only
  hero numbers, brand mark, primary CTA.
- **Glow is rare.** One glow per screen at most.
- **Linear-level density.** Tighter spacing than the legacy build. Tabular
  numerals everywhere money / time / counts appear.
- **Subtle texture on glass.** Radial overlay inside glass surfaces — never a
  flat blur.
- **Asymmetric grids.** 8-4 / 7-5 / 3-1 splits over 4-4-4-4.
- **Motion respects `prefers-reduced-motion`.**

### 7.2 Tokens (already wired in `src/app/globals.css`)

- `--surface-1`, `--surface-2`, `--surface-3` layered model
- `--primary`, `--primary-glow`, `--accent`, `--success`, `--warning`,
  `--info`, `--destructive`
- `--gradient-primary`, `--gradient-aurora`, `--gradient-text` (sparingly)
- Shadows: `--shadow-sm/md/lg/glow/elegant`
- `.glass`, `.gradient-text`, `.eyebrow`, `.kbd`, `.focus-ring` utility classes

### 7.3 Themes

- **Dark** (default): cinematic, aurora backdrop.
- **Light**: paper-clean, soft shadows, accent-tinted backgrounds desaturated.
- Theme is per-user (stored on `User.themeMode`), with localStorage fallback
  before login.

### 7.4 RTL

Not required (English + Bengali, both LTR). All layouts are LTR-only.

---

## 8. i18n

- **Locales:** `en` (default), `bn`.
- **URL-based:** `/en/...`, `/bn/...` — always prefixed.
- **Numbers:** Western numerals in both locales (per product decision).
- **Dates:** Bengali date format in `bn` (e.g., "২৬ মে, ২০২৬"); short format
  is locale-aware.
- **Bengali font:** Hind Siliguri (Latin + Bengali subsets), pairs with Inter.
- Strings live in `messages/en.json` and `messages/bn.json`. Server components
  use `getTranslations`, client components use `useTranslations`.

---

## 9. Code organization

```
src/
  app/                          # App Router
    layout.tsx                  # locale-agnostic shell (metadata only)
    page.tsx                    # / → /en redirect
    [locale]/
      layout.tsx                # html, fonts, providers, intl
      page.tsx                  # marketing/landing (logged-out)
      (auth)/                   # auth surfaces — no app shell
        login/page.tsx
        signup/page.tsx
        accept/page.tsx
      (app)/                    # protected app — wears AppLayout shell
        layout.tsx              # AppShell (sidebar + header)
        dashboard/page.tsx
        my/page.tsx
        clients/page.tsx
        clients/[id]/page.tsx
        leads/page.tsx
        projects/page.tsx
        projects/[id]/page.tsx
        tasks/page.tsx
        time/page.tsx
        finance/page.tsx
        invoices/page.tsx
        invoices/[id]/page.tsx
        proposals/page.tsx
        proposals/[id]/edit/page.tsx
        subscriptions/page.tsx
        team/page.tsx
        settings/(...)/page.tsx
      portal/[token]/page.tsx   # public client portal
      proposals/share/[token]/page.tsx  # public proposal share
    api/
      auth/[...nextauth]/route.ts
      cron/exchange-rates/route.ts
      webhooks/...
  components/
    ui/                         # shadcn primitives
    layout/                     # AppShell, Sidebar, Header, Footer
    dashboard/                  # briefing sections
    feature-specific/...        # one folder per feature
  features/                     # business logic per domain
    organizations/
      schemas.ts                # zod schemas
      queries.ts                # tanstack-query factories
      actions.ts                # server actions
      types.ts
    clients/...
    projects/...
    tasks/...
    finance/...
    invoices/...
    proposals/...
    subscriptions/...
    auth/...
    ...
  lib/
    db/                         # mongo connection, Mongoose models
      client.ts                 # cached Mongo connection
      models/                   # one Mongoose schema file per collection
        index.ts
        user.ts
        organization.ts
        ...
    auth/                       # Auth.js config
      config.ts
      session.ts                # getServerSession + permission helpers
    permissions/                # role + visibility logic
      check.ts
    currency/                   # rate fetcher, conversion helpers
      convert.ts
      fetch-rates.ts
    ai/                         # AI provider abstraction
      anthropic.ts
      openai.ts
      router.ts                 # picks provider with fallback
    storage/                    # Cloudflare R2 helpers
      r2.ts
    email/                      # Resend wrapper + React Email templates
    env.ts
    utils.ts
  hooks/
  i18n/
  middleware.ts
messages/
  en.json
  bn.json
```

---

## 10. Phased build order

| Phase | Deliverables | Ship signal |
|------:|---|---|
| **0** ✅ | Next.js + Tailwind v4 + i18n scaffold (done) | Dev server boots in `en` / `bn` |
| **1** | This document + roadmap | Architecture committed |
| **2** | MongoDB connection · Mongoose models · Auth.js (email + Google) · permission helpers · invitation flow · onboarding (first user → org owner) | Sign in works, org auto-creates |
| **3** | App shell rebuild — sidebar (collapsible, locale + theme integrated), header (search, copilot button, language, notifications) | Logged-in user sees the shell with empty pages |
| **4** | Settings (workspace + profile + members + customize-dashboard) · Team page | Can invite member, switch theme/locale, customize dashboard |
| **5** | Currency conversion infra · ExchangeRate cron · `<Money/>` component | Any monetary form auto-converts |
| **6** | Studio Briefing dashboard | First module visible, briefing AI placeholder |
| **7** | Clients + Leads + Projects + Tasks | Core delivery surface |
| **8** | Time Tracking + Finance + Invoices | Money in/out flowing |
| **9** | Proposals + Subscriptions | Sales surface |
| **10** | Public Client Portal + Proposal Share | External surfaces ready |
| **11** | Knowledge Base + Expenses w/ receipts + Reports + OKRs + Capacity + Notifications Center + Activity Feed | Phase C complete |
| **12** | AI surfaces (Copilot, briefing AI, draft email, generate tasks, proposal stream) · Email (Resend) · File storage (R2) | Power features live |
| **13** | Integrations (Slack, GitHub, Google Calendar, Stripe) | Phase D |
| **14** | Tests · accessibility audit · performance audit · production launch | v2 GA |

After every phase: commit (`Main Commits` message per user preference) + push.

---

## 11. Operational

### 11.1 Environments

- `development` — local, `.env.local`
- `production` — Vercel, env vars set in dashboard

### 11.2 Secrets segregation

- `lib/env.ts` exposes `publicEnv` (browser-safe) and `serverEnv` (server-only
  getters). Importing `serverEnv` from a `"use client"` file fails at build
  time because the underlying env vars are unavailable in the browser bundle.

### 11.3 Background jobs

- Vercel Cron for: daily exchange rate refresh, briefing cache regeneration,
  recurring invoice creation, subscription billing.
- All cron handlers live under `app/api/cron/*/route.ts` and verify a shared
  secret header to prevent abuse.

### 11.4 Backups

- MongoDB Atlas continuous backup (paid tier later); for now M0 free has
  weekly snapshots — acceptable while the agency runs internally.

---

## 12. Out of scope (decisions deferred)

- **Stripe payments** — tracked as Phase D integration.
- **Email/SMS marketing campaigns** — not a planned module.
- **Mobile app** — web is responsive; native apps are not in scope.
- **Multi-currency display preference per user** — v1 ships with org-level
  base currency only.
- **Custom roles beyond the 4 fixed** — not needed at agency scale.
- **RTL** — Arabic dropped from scope.

---

## 13. Glossary

- **Org / Organization** — top-level tenant, what we colloquially call "agency".
- **Workspace** — synonym for organization in UI copy.
- **Member** — a `User` linked to an `Organization` via `OrgMember`.
- **Lead** — pre-sales prospect, distinct from `Client`. Convert to client when won.
- **Briefing** — the AI-written daily summary that anchors the dashboard.
