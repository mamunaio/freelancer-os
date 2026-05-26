import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Receipt } from "lucide-react";

import { StubPage } from "@/components/layout/stub-page";
import { requireOrgContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions/roles";
import type { Locale } from "@/i18n/routing";

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgContext(locale);
  if (!can.viewInvoices(ctx.role)) {
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations({ locale, namespace: "Nav" });

  return (
    <StubPage
      locale={locale}
      title={t("invoices")}
      eyebrow={t("groupMoney")}
      icon={Receipt}
      phase="Phase 8"
    />
  );
}

export const dynamic = "force-dynamic";
