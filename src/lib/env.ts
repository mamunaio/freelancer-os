/**
 * Centralized environment variable access.
 *
 * `publicEnv` — safe to import from anywhere, including client components.
 * `serverEnv` — only call from server code (route handlers, server actions,
 * server components). Each accessor throws lazily so a missing key only
 * blows up the feature that needs it, not the whole app boot.
 */

const required = (name: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};

/** Public env — safe to read in browser. */
export const publicEnv = {
  exchangeRateApiUrl:
    process.env.EXCHANGE_RATE_API_URL ?? "https://open.er-api.com/v6/latest",
} as const;

/**
 * Server env — never imported from a client component.
 * Each property is a getter so missing keys only throw when their feature
 * actually runs.
 */
export const serverEnv = {
  // ─── MongoDB ──────────────────────────────────────────────────
  get mongoUri() {
    return required("MONGODB_URI", process.env.MONGODB_URI);
  },
  get mongoDb() {
    return required("MONGODB_DB", process.env.MONGODB_DB);
  },

  // ─── Auth.js ──────────────────────────────────────────────────
  get authSecret() {
    return required("AUTH_SECRET", process.env.AUTH_SECRET);
  },
  authUrl: process.env.AUTH_URL ?? "http://localhost:3000",
  googleClientId: process.env.AUTH_GOOGLE_ID ?? "",
  googleClientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",

  // ─── AI ───────────────────────────────────────────────────────
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
  openaiKey: process.env.OPENAI_API_KEY ?? "",

  // ─── Email (Resend) ───────────────────────────────────────────
  resendKey: process.env.RESEND_API_KEY ?? "",
  resendFromEmail: process.env.RESEND_FROM_EMAIL ?? "",

  // ─── File storage (Cloudflare R2) ─────────────────────────────
  r2AccountId: process.env.R2_ACCOUNT_ID ?? "",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  r2Bucket: process.env.R2_BUCKET ?? "",
  r2PublicUrl: process.env.R2_PUBLIC_URL ?? "",
} as const;
