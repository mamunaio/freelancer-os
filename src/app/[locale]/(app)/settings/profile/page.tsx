import { setRequestLocale, getTranslations } from "next-intl/server";
import { User as UserIcon } from "lucide-react";

import { StubPage } from "@/components/layout/stub-page";
import type { Locale } from "@/i18n/routing";

export default async function SettingsProfilePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Header" });
  return (
    <StubPage
      locale={locale}
      title={t("profile")}
      eyebrow={t("settings")}
      icon={UserIcon}
      phase="Phase 4"
    />
  );
}

export const dynamic = "force-dynamic";
