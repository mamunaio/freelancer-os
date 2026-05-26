import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { UsersRound } from "lucide-react";

import { StubPage } from "@/components/layout/stub-page";
import { requireOrgContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions/roles";
import type { Locale } from "@/i18n/routing";

export default async function SettingsMembersPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgContext(locale);
  if (!can.viewTeam(ctx.role)) {
    redirect(`/${locale}/settings/profile`);
  }

  const t = await getTranslations({ locale, namespace: "Settings.tabs" });
  return (
    <StubPage
      locale={locale}
      title={t("members")}
      eyebrow="Settings"
      icon={UsersRound}
      phase="Phase 4c"
    />
  );
}

export const dynamic = "force-dynamic";
