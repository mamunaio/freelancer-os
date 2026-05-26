import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/types";
import { publicEnv } from "@/lib/env";

/**
 * Server-side Supabase client (App Router).
 * Wires Next's cookies() into Supabase so SSR auth Just Works.
 *
 * Note: setAll throws inside server components — that's expected and safe to
 * ignore as long as middleware refreshes the session on every request.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component — refresh happens via middleware.
          }
        },
      },
    },
  );
}
