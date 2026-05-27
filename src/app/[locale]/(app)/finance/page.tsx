import { redirect } from "next/navigation";

import { hasLocale, type Locale } from "@/i18n/routing";

/**
 * Legacy `/finance` route — replaced by `/money` in sub-phase 8a. Kept
 * as a redirect so existing bookmarks and outbound links continue to
 * resolve.
 */
export default async function FinanceRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = hasLocale(locale) ? locale : "en";
  redirect(`/${safeLocale}/money`);
}

export const dynamic = "force-dynamic";
