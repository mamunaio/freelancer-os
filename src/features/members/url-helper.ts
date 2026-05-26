/**
 * Client-safe invitation URL builder.
 *
 * The server-side equivalent (`@/lib/url`) needs `serverEnv` and isn't
 * importable in the browser. This version derives the origin from the
 * current `window.location` so it works in both dev and prod.
 */

import type { Locale } from "@/i18n/routing";

export function inviteUrlFromToken(
  token: string,
  locale: Locale = "en",
): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/${locale}/auth/invite/${encodeURIComponent(token)}`;
}
