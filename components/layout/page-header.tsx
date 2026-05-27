import type { ReactNode } from "react";

interface PageHeaderProps {
  /** Small uppercased label above the title (module name, etc). */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Right-side action area — usually a primary button. */
  actions?: ReactNode;
  /** Optional metadata pills below the title (counts, badges). */
  meta?: ReactNode;
}

/**
 * Standard module page header — used at the top of Clients, Projects, etc.
 *
 * Pure server-component-friendly. The page that mounts this header brings
 * its own translations and passes the resolved strings in.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  meta,
}: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
      <div className="min-w-0 space-y-1">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {subtitle}
          </p>
        )}
        {meta && <div className="pt-2">{meta}</div>}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
