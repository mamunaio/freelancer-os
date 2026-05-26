import { setRequestLocale, getTranslations } from "next-intl/server";
import { Settings as SettingsIcon } from "lucide-react";

import { StubPage } from "@/components/layout/stub-page";
import type { Locale } from "@/i18n/routing";

export default async function SettingsPage({
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
      title={t("settings")}
      eyebrow={t("groupOrg")}
      icon={SettingsIcon}
      phase="Phase 4"
    />
  );
}

export const dynamic = "force-dynamic";
