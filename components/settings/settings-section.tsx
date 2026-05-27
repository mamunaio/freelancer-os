import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  children: ReactNode;
  /** Optional content rendered to the right of the section header. */
  action?: ReactNode;
}

/**
 * Standard settings section — left rail (title + helper text) + right rail
 * (form fields). Stacks on mobile.
 *
 * Stripe / Linear style. Used inside every settings tab to keep things
 * visually consistent.
 */
export function SettingsSection({ title, description, children, action }: Props) {
  return (
    <section className="grid gap-4 border-t border-[hsl(var(--border))] pt-6 md:grid-cols-[260px_1fr] md:gap-8">
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-display text-base font-semibold tracking-tight">
            {title}
          </h2>
          {action}
        </div>
        {description && (
          <p className="text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
