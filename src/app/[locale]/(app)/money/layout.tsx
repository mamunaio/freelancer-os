import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { requireOrgContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions/roles";
import { hasLocale, type Locale } from "@/i18n/routing";
import { PageHeader } from "@/components/layout/page-header";
import { MoneyTabs } from "@/components/money/money-tabs";

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * Money parent layout.
 *
 * Server-side gates with `can.viewFinance(role)` so Members can never see
 * any descendant tab. Manager+ can read everything, Admin+ can write.
 * The shared header + tab strip live here so each tab's `page.tsx` is
 * just content.
 */
export default async function MoneyLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  const safeLocale: Locale = hasLocale(locale) ? locale : "en";
  setRequestLocale(safeLocale);

  const ctx = await requireOrgContext(safeLocale);
  if (!can.viewFinance(ctx.role)) {
    redirect(`/${safeLocale}/dashboard`);
  }

  const t = await getTranslations({
    locale: safeLocale,
    namespace: "Money",
  });

  return (
    <div>
      <PageHeader
        eyebrow={t("title")}
        title={t("title")}
        subtitle={t("subtitle")}
      />

      <MoneyTabs
        labels={{
          overview: t("tabs.overview"),
          ledger: t("tabs.ledger"),
          invoices: t("tabs.invoices"),
          subscriptions: t("tabs.subscriptions"),
          reports: t("tabs.reports"),
        }}
      />

      {children}
    </div>
  );
}
