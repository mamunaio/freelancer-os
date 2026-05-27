import type { ReactNode } from "react";

import { BriefingSection } from "./sections/briefing-section";
import { PrioritySection } from "./sections/priority-section";
import { RevenueSection } from "./sections/revenue-section";
import { PulseSection } from "./sections/pulse-section";
import { StatsSection } from "./sections/stats-section";
import { UpcomingSection } from "./sections/upcoming-section";
import type { DashboardSectionId } from "@/lib/dashboard/sections";
import type { DemoDashboardData } from "./demo-data";

/**
 * Map a section id to its renderer.
 *
 * Keeps the page itself layout-agnostic — it just walks the user's saved
 * order and picks the matching component from this registry.
 */
export function renderDashboardSection(
  id: DashboardSectionId,
  data: DemoDashboardData,
): ReactNode {
  switch (id) {
    case "briefing":
      return <BriefingSection data={data.briefing} />;
    case "priority":
      return <PrioritySection data={data.priority} />;
    case "revenue":
      return <RevenueSection data={data.revenue} />;
    case "pulse":
      return <PulseSection data={data.pulse} />;
    case "stats":
      return <StatsSection data={data.stats} />;
    case "upcoming":
      return <UpcomingSection data={data.upcoming} />;
    default:
      return null;
  }
}
