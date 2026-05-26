import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { UsersRound } from "lucide-react";

import { StubPage } from "@/components/layout/stub-page";
import { requireOrgContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions/roles";
import type { Locale } from "@/i18n/routing";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgContext(locale);
  if (!can.viewTeam(ctx.role)) {
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations({ locale, namespace: "Nav" });

  return (
    <StubPage
      locale={locale}
      title={t("team")}
      eyebrow={t("groupOrg")}
      icon={UsersRound}
      phase="Phase 4"
    />
  );
}

export const dynamic = "force-dynamic";
