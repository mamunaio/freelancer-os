import { setRequestLocale, getTranslations } from "next-intl/server";
import { Inbox } from "lucide-react";

import { StubPage } from "@/components/layout/stub-page";
import type { Locale } from "@/i18n/routing";

export default async function InboxPage({
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
      title={t("inbox")}
      eyebrow={t("groupWorkspace")}
      icon={Inbox}
      phase="Phase C"
    />
  );
}

export const dynamic = "force-dynamic";
