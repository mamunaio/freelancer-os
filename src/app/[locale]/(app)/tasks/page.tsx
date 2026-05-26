import { setRequestLocale, getTranslations } from "next-intl/server";
import { ListChecks } from "lucide-react";

import { StubPage } from "@/components/layout/stub-page";
import type { Locale } from "@/i18n/routing";

export default async function TasksPage({
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
      title={t("tasks")}
      eyebrow={t("groupDelivery")}
      icon={ListChecks}
      phase="Phase 7"
    />
  );
}

export const dynamic = "force-dynamic";
