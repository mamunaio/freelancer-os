import { setRequestLocale, getTranslations } from "next-intl/server";
import { Timer } from "lucide-react";

import { StubPage } from "@/components/layout/stub-page";
import type { Locale } from "@/i18n/routing";

export default async function TimePage({
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
      title={t("time")}
      eyebrow={t("groupDelivery")}
      icon={Timer}
      phase="Phase 8"
    />
  );
}

export const dynamic = "force-dynamic";
