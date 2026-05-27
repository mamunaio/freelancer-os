import Link from "next/link";
import { routing } from "@/i18n/routing";

/**
 * Top-level 404 — used when no [locale] segment matches.
 * Once we move into Phase 1 we'll add a locale-aware not-found.tsx inside
 * [locale]/ that uses translations.
 */
export default function NotFound() {
  return (
    <html lang={routing.defaultLocale}>
      <body className="grid min-h-screen place-items-center bg-[hsl(var(--background))] px-6 text-[hsl(var(--foreground))]">
        <div className="text-center">
          <p className="eyebrow">404</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            Page not found
          </h1>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
            We couldn&apos;t find the page you were looking for.
          </p>
          <Link
            href={`/${routing.defaultLocale}`}
            className="mt-6 inline-flex h-10 items-center rounded-lg bg-[hsl(var(--primary))] px-5 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90"
          >
            Back to home
          </Link>
        </div>
      </body>
    </html>
  );
}
