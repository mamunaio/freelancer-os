# Injaazh OS

Single-tenant agency operating system. CRM, projects, finance, proposals,
focus timer, and an AI copilot — all bound together by a Supabase backend.

> **v2 in progress.** This branch is the Next.js 15 + Tailwind v4 rewrite.
> The legacy Vite + React Router 6 codebase is preserved on the
> [`legacy-vite`](https://github.com/mamunaio/freelancer-os/tree/legacy-vite)
> branch on GitHub.

## Stack

- Next.js 15 (App Router, Turbopack dev)
- React 19
- Tailwind CSS v4 (CSS-first `@theme`)
- Supabase + `@supabase/ssr`
- next-intl (English default, Bengali secondary)
- TanStack Query v5
- shadcn/ui (new-york style) + Radix UI
- Framer Motion
- Sonner (toasts)
- TipTap (rich text)
- Recharts + react-pdf (charts and PDF exports)

## Local development

```bash
npm install
cp .env.example .env.local   # then paste your Supabase keys
npm run dev                  # http://localhost:3000
```

The dev server runs on Turbopack. The first hit to `/` redirects to
`/en` (default locale) — `/bn` is the Bengali variant.

## Project structure

```
src/
  app/                  # App Router
    layout.tsx          # locale-agnostic shell (metadata only)
    page.tsx            # / → /en redirect
    [locale]/
      layout.tsx        # html, fonts, providers, NextIntlClientProvider
      page.tsx          # current scaffold landing
  components/
    providers.tsx       # QueryClient + Theme + Toaster
    theme-provider.tsx  # dark/light toggle, persists to localStorage
    scaffold/           # phase 0 placeholder (will be removed)
    ui/                 # shadcn primitives (added per-feature)
  i18n/
    routing.ts          # locale list + defaults
    request.ts          # message catalog loader
    navigation.ts       # locale-aware <Link> / useRouter / usePathname
  lib/
    env.ts              # publicEnv / serverEnv accessors
    utils.ts            # cn() helper
    supabase/
      client.ts         # browser client
      server.ts         # server client (cookies wired)
      middleware.ts     # session refresh helper
      types.ts          # generated DB types (regen pending)
  middleware.ts         # combines next-intl + Supabase session refresh
messages/
  en.json               # English message catalog
  bn.json               # Bengali message catalog
public/
  favicon.png
  brand/injaazh-logo.png
```

## Migration plan

This is **Phase 0** — foundation only. Subsequent phases:

| Phase | Focus |
|------:|-------|
| 0 | ✅ Next.js + Tailwind v4 + i18n + Supabase SSR scaffold |
| 1 | Auth + protected layout shell + dashboard |
| 2 | Clients · Projects · Tasks |
| 3 | Finance · Invoice Maker · Proposals |
| 4 | Multi-currency (BDT ↔ USD with daily live rate) |
| 5 | AI surfaces · Realtime notifications · Public portal |
| 6 | Polish · tests · accessibility audit |

## Environment

Public Supabase keys go in `NEXT_PUBLIC_*` and are safe to expose. The
service role key (`SUPABASE_SERVICE_ROLE_KEY`) is server-only and never
imported from a client component — `lib/env.ts` enforces this.

## License

Private — single-tenant.
