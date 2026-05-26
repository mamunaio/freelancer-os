import { setRequestLocale } from "next-intl/server";

import { connectMongoose } from "@/lib/db/client";
import { User } from "@/lib/db/models";
import { requireOrgContext } from "@/lib/auth/session";
import {
  DASHBOARD_SECTIONS,
  defaultLayoutForRole,
  isVisibleToRole,
  reconcileLayout,
  type UserSectionState,
} from "@/lib/dashboard/sections";
import { CustomizeForm } from "@/components/settings/dashboard-layout/customize-form";
import type { Locale } from "@/i18n/routing";

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

/**
 * Settings → Dashboard layout customization.
 *
 * Server fetches the user's saved sections (if any), reconciles them with
 * the current catalog (drops unknown ids, appends new ones, force-keeps
 * locked sections visible), and hands the result + role-default to the
 * client form.
 */
export default async function CustomizeDashboardPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgContext(locale);

  await connectMongoose();
  const user = await User.findById(ctx.session.userId)
    .select("dashboardLayout")
    .lean();

  const saved = (user?.dashboardLayout?.sections ??
    []) as UserSectionState[];
  const reconciled = reconcileLayout(saved, ctx.role);
  const defaults = defaultLayoutForRole(ctx.role);

  const catalog = DASHBOARD_SECTIONS.filter((s) =>
    isVisibleToRole(s, ctx.role),
  ).map((s) => ({ id: s.id, locked: Boolean(s.locked) }));

  return (
    <CustomizeForm
      locale={locale}
      initial={reconciled}
      defaultLayout={defaults}
      catalog={catalog}
    />
  );
}

export const dynamic = "force-dynamic";
