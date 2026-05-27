import { setRequestLocale, getTranslations } from "next-intl/server";

import { connectMongoose } from "@/lib/db/client";
import { User } from "@/lib/db/models";
import { requireOrgContext } from "@/lib/auth/session";
import {
  reconcileLayout,
  type UserSectionState,
} from "@/lib/dashboard/sections";
import { buildDemoDashboardData } from "@/features/dashboard";
import { renderDashboardSection } from "@/features/dashboard/section-registry";
import type { Locale } from "@/i18n/routing";
import { Sparkles } from "lucide-react";

/**
 * Studio Briefing dashboard (Phase 6).
 *
 * Renders sections in the user's saved order, skipping any toggled off. The
 * data is currently demo content (deterministic, anchored to today's date)
 * so the design lands before the data-tier modules ship.
 */
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgContext(locale);

  // Load saved layout, reconcile against the catalog (drops removed ids,
  // appends new ones, force-keeps locked sections visible).
  await connectMongoose();
  const user = await User.findById(ctx.session.userId)
    .select("dashboardLayout name")
    .lean();

  const saved = (user?.dashboardLayout?.sections ??
    []) as UserSectionState[];
  const reconciled = reconcileLayout(saved, ctx.role);

  // Anchor demo data to today so all sections agree on "now".
  const firstName =
    user?.name?.split(/\s+/)[0]?.trim() ||
    ctx.session.email.split("@")[0];
  const data = buildDemoDashboardData(new Date(), { firstName });

  const t = await getTranslations({ locale, namespace: "Dashboard" });

  // Render only visible sections in the saved order.
  const visible = reconciled.filter((s) => s.visible);

  return (
    <div className="space-y-6">
      {/* Demo banner */}
      <div className="flex items-start gap-2.5 rounded-lg border border-[hsl(var(--info))]/30 bg-[hsl(var(--info))]/8 px-3 py-2 text-[11px] text-[hsl(var(--info))]">
        <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
        <p>
          <span className="font-semibold">{t("demoBadge")}.</span>{" "}
          <span className="text-[hsl(var(--foreground))]/80">
            {t("demoNotice")}
          </span>
        </p>
      </div>

      {visible.map(({ id }) => (
        <div key={id}>{renderDashboardSection(id, data)}</div>
      ))}
    </div>
  );
}

export const dynamic = "force-dynamic";
