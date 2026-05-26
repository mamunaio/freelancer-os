# Injaazh OS

Multi-user agency operating system. CRM, projects, finance, proposals,
focus timer, and an AI copilot — built for small studios and their teams.

> **v2 in progress.** This branch is the Next.js 15 + Tailwind v4 rewrite,
> backed by MongoDB Atlas. The legacy Vite + Supabase codebase is preserved
> on the [`legacy-vite`](https://github.com/mamunaio/freelancer-os/tree/legacy-vite)
> branch on GitHub.

## Stack

- Next.js 15 (App Router, Turbopack dev)
- React 19
- Tailwind CSS v4 (CSS-first `@theme`)
- MongoDB Atlas (data layer — wiring in progress)
- Auth.js (auth — wiring in progress)
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
cp .env.example .env.local   # fill in MONGODB_URI, AUTH_SECRET, etc.
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
  middleware.ts         # next-intl locale routing (auth lands here next)
messages/
  en.json               # English message catalog
  bn.json               # Bengali message catalog
public/
  favicon.png
  brand/injaazh-logo.png
```

## Roadmap

| Phase | Focus |
|------:|-------|
| 0 | ✅ Next.js + Tailwind v4 + i18n scaffold |
| 1 | Architecture decisions (multi-tenant, modules, dashboard concept) |
| 2 | MongoDB + Auth.js + organization/team model |
| 3 | App shell + protected layout |
| 4 | Module-by-module port |
| 5 | AI surfaces, file storage, email |
| 6 | Polish, tests, accessibility audit |

## Environment

All secrets live in `.env.local` (gitignored). Use `.env.example` as the
template. Server-only secrets (Mongo URI, AUTH_SECRET, API keys) must
never be imported from a client component — `lib/env.ts` segregates
public vs. server access.

## License

Private.
