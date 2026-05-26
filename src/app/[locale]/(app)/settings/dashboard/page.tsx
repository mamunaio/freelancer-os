import { setRequestLocale, getTranslations } from "next-intl/server";
import { LayoutDashboard } from "lucide-react";

import { StubPage } from "@/components/layout/stub-page";
import type { Locale } from "@/i18n/routing";

export default async function SettingsDashboardPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Settings.tabs" });
  return (
    <StubPage
      locale={locale}
      title={t("dashboard")}
      eyebrow="Settings"
      icon={LayoutDashboard}
      phase="Phase 4d"
    />
  );
}

export const dynamic = "force-dynamic";
