import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Repeat2 } from "lucide-react";

import { StubPage } from "@/components/layout/stub-page";
import { requireOrgContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions/roles";
import type { Locale } from "@/i18n/routing";

export default async function SubscriptionsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgContext(locale);
  if (!can.viewSubscriptions(ctx.role)) {
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations({ locale, namespace: "Nav" });

  return (
    <StubPage
      locale={locale}
      title={t("subscriptions")}
      eyebrow={t("groupMoney")}
      icon={Repeat2}
      phase="Phase 9"
    />
  );
}

export const dynamic = "force-dynamic";
