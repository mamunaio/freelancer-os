import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";

import { requireSession } from "@/lib/auth/session";
import type { Locale } from "@/i18n/routing";

/**
 * Protected layout — the actual app shell (sidebar/header) lands in a later
 * phase. For now it just enforces auth so anything under /(app)/ requires a
 * signed-in user.
 *
 * `params.locale` is typed loosely (string) because Next.js generates the
 * LayoutProps type from the segment name, not our routing config. We narrow
 * to `Locale` after validation in `requireSession`.
 */
export default async function AppLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requireSession(locale as Locale);

  return <>{children}</>;
}
