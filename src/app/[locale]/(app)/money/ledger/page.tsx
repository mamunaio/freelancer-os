import { setRequestLocale, getTranslations } from "next-intl/server";

import { MoneyStubTab } from "@/components/money/stub-tab";
import { hasLocale, type Locale } from "@/i18n/routing";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function MoneyLedgerPage({ params }: PageProps) {
  const { locale } = await params;
  const safeLocale: Locale = hasLocale(locale) ? locale : "en";
  setRequestLocale(safeLocale);

  const t = await getTranslations({
    locale: safeLocale,
    namespace: "Money.stub",
  });

  return <MoneyStubTab message={t("ledger")} phase="Sub-phase 8b" />;
}

export const dynamic = "force-dynamic";
