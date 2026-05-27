import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";

import { StubPage } from "@/components/layout/stub-page";
import { requireOrgContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions/roles";
import type { Locale } from "@/i18n/routing";

export default async function SettingsBillingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgContext(locale);
  if (!can.manageBilling(ctx.role)) {
    redirect(`/${locale}/settings/profile`);
  }

  const t = await getTranslations({ locale, namespace: "Settings.tabs" });
  return (
    <StubPage
      locale={locale}
      title={t("billing")}
      eyebrow="Settings"
      icon={CreditCard}
      phase="Phase D"
    />
  );
}

export const dynamic = "force-dynamic";
