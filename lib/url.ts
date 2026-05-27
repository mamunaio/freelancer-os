/**
 * URL helpers — keep in one place so tokens, locales, and prefixes don't
 * drift across server actions and client UI.
 */

import { serverEnv } from "@/lib/env";
import type { Locale } from "@/i18n/routing";

/** Returns the origin used to build absolute URLs. Server-only. */
export function getBaseUrl(): string {
  // Prefer AUTH_URL if set, otherwise fall back to localhost — same priority
  // Auth.js uses, so callbacks and invitation links agree.
  return (
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    serverEnv.authUrl ??
    "http://localhost:3000"
  );
}

/** Build an absolute invitation accept URL. */
export function inviteUrl(token: string, locale: Locale = "en"): string {
  const base = getBaseUrl().replace(/\/+$/, "");
  return `${base}/${locale}/auth/invite/${encodeURIComponent(token)}`;
}
