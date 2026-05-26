/**
 * Centralized environment variable access.
 * Server-only secrets are isolated from public ones to make leaks obvious.
 */

const required = (name: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};

/** Public env — safe to read in browser. */
export const publicEnv = {
  supabaseUrl: required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  supabaseAnonKey: required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
  exchangeRateApiUrl:
    process.env.EXCHANGE_RATE_API_URL ?? "https://open.er-api.com/v6/latest",
} as const;

/**
 * Server env — never imported from a client component.
 * Throws at runtime if accessed without the service role being configured.
 */
export const serverEnv = {
  get supabaseServiceRoleKey() {
    return required(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  },
} as const;
