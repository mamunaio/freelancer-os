import { redirect } from "next/navigation";

import { hasLocale, type Locale } from "@/i18n/routing";

/**
 * Legacy `/subscriptions` route — collapsed into the Money module's
 * subscriptions tab in sub-phase 8a.
 */
export default async function SubscriptionsRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = hasLocale(locale) ? locale : "en";
  redirect(`/${safeLocale}/money/subscriptions`);
}

export const dynamic = "force-dynamic";
