import { setRequestLocale, getTranslations } from "next-intl/server";
import { KanbanSquare } from "lucide-react";

import { StubPage } from "@/components/layout/stub-page";
import type { Locale } from "@/i18n/routing";

export default async function ProjectsPage({
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
      title={t("projects")}
      eyebrow={t("groupDelivery")}
      icon={KanbanSquare}
      phase="Phase 7"
    />
  );
}

export const dynamic = "force-dynamic";
