import { setRequestLocale, getTranslations } from "next-intl/server";
import { FileText } from "lucide-react";

import { StubPage } from "@/components/layout/stub-page";
import type { Locale } from "@/i18n/routing";

export default async function ProposalsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Nav" });
  return (
    <StubPage
      locale={locale}
      title={t("proposals")}
      eyebrow={t("groupSales")}
      icon={FileText}
      phase="Phase 9"
    />
  );
}

export const dynamic = "force-dynamic";
