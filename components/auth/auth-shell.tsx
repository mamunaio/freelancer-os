import type { ReactNode } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import type { Locale } from "@/i18n/routing";

interface AuthShellProps {
  locale: Locale;
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Shared shell for the auth surfaces.
 *
 * Editorial split — left column is the brand panel (aurora, logo, tagline),
 * right column is the form. Collapses to a single column on mobile.
 */
export function AuthShell({
  locale,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden border-r border-[hsl(var(--border))] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 -z-10 [background-image:var(--gradient-aurora)]" />
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2.5 text-sm font-medium"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
            <Sparkles className="h-4 w-4 text-[hsl(var(--primary-foreground))]" />
          </span>
          <span className="font-display tracking-tight">
            Injaazh <span className="gradient-text">OS</span>
          </span>
        </Link>

        <div className="max-w-md">
          <p className="eyebrow">Built for studios</p>
          <h2 className="mt-3 font-display text-4xl font-bold leading-tight tracking-tight">
            One workspace for clients, projects, money — and the team that
            makes it happen.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
            CRM, projects, finance, proposals, and an AI copilot that knows
            your business. Built for small agencies and the people who run
            them.
          </p>
        </div>

        <div className="flex items-center gap-6 text-[11px] text-[hsl(var(--muted-foreground))]">
          <span>© {new Date().getFullYear()} Injaazh</span>
          <span>·</span>
          <span>Single workspace, multi-user</span>
        </div>
      </aside>

      {/* Form panel */}
      <section className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
              {subtitle}
            </p>
          )}

          <div className="mt-8">{children}</div>

          {footer && (
            <div className="mt-8 text-center text-xs text-[hsl(var(--muted-foreground))]">
              {footer}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
