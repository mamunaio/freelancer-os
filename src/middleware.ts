import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

/**
 * Combined middleware:
 *  1. Refresh the Supabase auth cookies on every navigation.
 *  2. Apply next-intl locale routing.
 *
 * Order matters — the Supabase helper sets cookies on the response, so we
 * pass that response into the i18n middleware which may rewrite/redirect.
 */
export async function middleware(request: NextRequest) {
  // Refresh tokens; this returns a NextResponse with updated cookies.
  const supabaseResponse = await updateSupabaseSession(request);

  const intlResponse = intlMiddleware(request);

  // Merge the cookies set by Supabase into whatever next-intl returned.
  for (const cookie of supabaseResponse.cookies.getAll()) {
    intlResponse.cookies.set(cookie);
  }

  return intlResponse ?? NextResponse.next();
}

export const config = {
  // Skip static assets and API routes; everything else flows through i18n + auth.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};
