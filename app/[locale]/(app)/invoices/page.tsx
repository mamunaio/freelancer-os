import { redirect } from "next/navigation";

import { hasLocale, type Locale } from "@/i18n/routing";

/**
 * Legacy `/invoices` route — collapsed into the Money module's invoices
 * tab in sub-phase 8a.
 */
export default async function InvoicesRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale: Locale = hasLocale(locale) ? locale : "en";
  redirect(`/${safeLocale}/money/invoices`);
}

export const dynamic = "force-dynamic";
