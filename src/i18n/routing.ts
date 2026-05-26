import { defineRouting } from "next-intl/routing";

/**
 * Locale routing configuration.
 * - English is the default (no prefix on /en routes when "as-needed" is set)
 * - Bengali is opt-in via /bn prefix
 *
 * We use "always" prefix so URLs are predictable and shareable across locales.
 */
export const routing = defineRouting({
  locales: ["en", "bn"] as const,
  defaultLocale: "en",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

/** Type-narrowing locale guard (next-intl 3.x doesn't ship one). */
export function hasLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    (routing.locales as readonly string[]).includes(value)
  );
}
