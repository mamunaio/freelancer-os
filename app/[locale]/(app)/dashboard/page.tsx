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
import { DemoBanner } from "@/components/ui/demo-banner";

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

  // Render only visible sections.
  const visible = reconciled.filter((s) => s.visible);

  // Enforce the master Bento Grid order for a structured hierarchy
  const MASTER_ORDER = ["briefing", "stats", "priority", "revenue", "pulse", "upcoming"];
  const orderedVisible = [...visible].sort((a, b) => {
    const rankA = MASTER_ORDER.indexOf(a.id) === -1 ? 999 : MASTER_ORDER.indexOf(a.id);
    const rankB = MASTER_ORDER.indexOf(b.id) === -1 ? 999 : MASTER_ORDER.indexOf(b.id);
    return rankA - rankB;
  });

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6 lg:grid-flow-row-dense">
      <DemoBanner />

      {orderedVisible.map(({ id }) => {
        // Bento Grid col-span mapping
        let colSpan = "lg:col-span-12";
        if (id === "priority") colSpan = "lg:col-span-8";
        else if (id === "revenue") colSpan = "lg:col-span-4";
        else if (id === "pulse") colSpan = "lg:col-span-12";
        else if (id === "stats") colSpan = "lg:col-span-12";
        else if (id === "upcoming") colSpan = "lg:col-span-12";

        return (
          <div key={id} className={`col-span-1 ${colSpan}`}>
            {renderDashboardSection(id, data)}
          </div>
        );
      })}
    </div>
  );
}

export const dynamic = "force-dynamic";
