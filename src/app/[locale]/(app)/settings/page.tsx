import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { connectMongoose } from "@/lib/db/client";
import { Organization } from "@/lib/db/models";
import { requireOrgContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions/roles";
import { WorkspaceForm } from "@/components/settings/workspace-form";
import type { Locale } from "@/i18n/routing";

/**
 * Settings → Workspace tab.
 *
 * Manager and below can't edit workspace settings, so they're bounced to the
 * profile tab instead of seeing a forbidden page.
 */
export default async function SettingsPage({
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

  await connectMongoose();
  const org = await Organization.findById(ctx.organizationId)
    .select("name tagline logoUrl accentHsl baseCurrency taxRate")
    .lean();

  if (!org) {
    redirect(`/${locale}/auth/login`);
  }

  return (
    <WorkspaceForm
      locale={locale}
      initial={{
        name: org.name ?? "",
        tagline: org.tagline ?? "",
        logoUrl: org.logoUrl ?? "",
        accentHsl: org.accentHsl ?? "226 100% 65%",
        baseCurrency: (org.baseCurrency ?? "USD") as "USD" | "BDT",
        taxRate: typeof org.taxRate === "number" ? org.taxRate : 0,
      }}
    />
  );
}

export const dynamic = "force-dynamic";
