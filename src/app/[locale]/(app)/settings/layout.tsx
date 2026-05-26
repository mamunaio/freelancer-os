import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { requireOrgContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions/roles";
import type { Locale } from "@/i18n/routing";
import {
  SettingsTabs,
  type SettingsTabIcon,
} from "@/components/settings/settings-tabs";

interface Tab {
  id: SettingsTabIcon;
  href: string;
  label: string;
  exact: boolean;
  visible: boolean;
}

/**
 * Settings shell — left-rail tab navigation, right-pane content.
 *
 * Tabs are filtered by role: members and workspace are admin+, profile and
 * dashboard are everyone, billing/integrations are owner-only stubs.
 *
 * Note: tab definitions stay as plain serializable objects (no icon
 * component references) because they cross the server-to-client boundary.
 * Icons are resolved inside `SettingsTabs` from the `id`.
 */
export default async function SettingsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgContext(locale as Locale);
  const t = await getTranslations({ locale, namespace: "Settings" });

  const tabs: Tab[] = [
    {
      id: "workspace",
      href: "/settings",
      label: t("tabs.workspace"),
      visible: can.editWorkspaceSettings(ctx.role),
      exact: true,
    },
    {
      id: "profile",
      href: "/settings/profile",
      label: t("tabs.profile"),
      visible: true,
      exact: true,
    },
    {
      id: "members",
      href: "/settings/members",
      label: t("tabs.members"),
      visible: can.viewTeam(ctx.role),
      exact: false,
    },
    {
      id: "dashboard",
      href: "/settings/dashboard",
      label: t("tabs.dashboard"),
      visible: true,
      exact: true,
    },
    {
      id: "billing",
      href: "/settings/billing",
      label: t("tabs.billing"),
      visible: can.manageBilling(ctx.role),
      exact: true,
    },
    {
      id: "integrations",
      href: "/settings/integrations",
      label: t("tabs.integrations"),
      visible: can.editWorkspaceSettings(ctx.role),
      exact: true,
    },
  ];

  const visibleTabs = tabs.filter((tab) => tab.visible);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 md:mb-8">
        <p className="eyebrow">{t("title")}</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))]">
          {t("subtitle")}
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <SettingsTabs tabs={visibleTabs} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
