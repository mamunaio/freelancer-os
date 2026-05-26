import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Plug } from "lucide-react";

import { StubPage } from "@/components/layout/stub-page";
import { requireOrgContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions/roles";
import type { Locale } from "@/i18n/routing";

export default async function SettingsIntegrationsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgContext(locale);
  if (!can.editWorkspaceSettings(ctx.role)) {
    redirect(`/${locale}/settings/profile`);
  }

  const t = await getTranslations({ locale, namespace: "Settings.tabs" });
  return (
    <StubPage
      locale={locale}
      title={t("integrations")}
      eyebrow="Settings"
      icon={Plug}
      phase="Phase D"
    />
  );
}

export const dynamic = "force-dynamic";
