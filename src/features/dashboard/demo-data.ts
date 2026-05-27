/**
 * Demo data for the Studio Briefing dashboard.
 *
 * Phase 6 ships the dashboard with deterministic dummy content so the
 * design lands before the data-tier modules (Clients, Projects, Tasks,
 * Finance, Invoices) come online. Every section reads from this file —
 * once those features ship, this module is replaced by real queries.
 *
 * Rules:
 *   - All values are deterministic. No Math.random / Date.now at runtime.
 *   - Dates are derived from a single `anchor` argument so the whole page
 *     renders coherently from one request-time "now".
 *   - Output stays as plain JSON — safe to pass server → client.
 */

import type { Currency } from "@/lib/currency/types";

// ────────────────────────────────────────────────────────────
// Core types
// ────────────────────────────────────────────────────────────

export interface DemoDashboardData {
  briefing: BriefingData;
  priority: PriorityData;
  revenue: RevenueData;
  pulse: PulseData;
  stats: StatsData;
  upcoming: UpcomingData;
}

export interface BriefingData {
  /** ISO date string for the hero heading (e.g., "2026-05-27"). */
  today: string;
  greeting: string;
  /** AI-generated style summary, 2-3 sentences. */
  summary: string;
  /** Quick capture placeholder. */
  quickCapturePlaceholder: string;
}

export interface PriorityData {
  task: {
    title: string;
    project: string;
    client: string;
    dueIn: string; // "today" | "tomorrow" | "2 days"
    priority: "high" | "medium" | "low";
  };
  deadline: {
    title: string;
    client: string;
    daysLeft: number;
  };
  invoice: {
    number: string;
    client: string;
    amount: number;
    currency: Currency;
    daysOverdue: number;
  };
}

export interface RevenueData {
  /** 6 entries — Dec, Jan, Feb, Mar, Apr, May etc. (rolling 6 months). */
  months: { label: string; revenue: number; expense: number }[];
  monthToDate: number;
  monthToDateChangePct: number; // vs previous month
  yearToDate: number;
  currency: Currency;
}

export interface PulseData {
  activity: {
    id: string;
    actor: string;
    action: string;
    target: string;
    relative: string;
    type: "task" | "invoice" | "client" | "project" | "comment";
  }[];
  insights: {
    id: string;
    kind: "profit" | "risk" | "alert" | "info";
    title: string;
    body: string;
  }[];
}

export interface StatsData {
  activeClients: number;
  activeClientsDelta: number; // since last month
  activeProjects: number;
  activeProjectsDelta: number;
  billableHours: number; // this week
  billableHoursTarget: number;
  cashPosition: number;
  retainerMrr: number;
  satisfaction: number; // 1-100 score
  currency: Currency;
}

export interface UpcomingData {
  days: {
    /** ISO date string. */
    date: string;
    /** "Mon", "Tue" — 3-letter weekday. */
    weekday: string;
    /** Day of month. */
    day: number;
    items: {
      id: string;
      label: string;
      kind: "task" | "deadline" | "meeting" | "invoice";
    }[];
  }[];
}

// ────────────────────────────────────────────────────────────
// Builder
// ────────────────────────────────────────────────────────────

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Build a deterministic dataset anchored at the given date. */
export function buildDemoDashboardData(
  anchor: Date,
  options: { firstName?: string } = {},
): DemoDashboardData {
  const isoDate = anchor.toISOString().slice(0, 10);
  const firstName = options.firstName ?? "Founder";

  return {
    briefing: {
      today: isoDate,
      greeting: `${firstName}`,
      summary:
        "Three priority tasks are open, two client follow-ups are due today, and ৳120,000 is expected this week. Net month-to-date is up 12% versus last month — Lumen Corp's retainer settled early.",
      quickCapturePlaceholder: "Add a task, a note, or 'remind me to…'",
    },

    priority: {
      task: {
        title: "Review Q3 brand guidelines for Lumen",
        project: "Lumen brand refresh",
        client: "Lumen Corp",
        dueIn: "today",
        priority: "high",
      },
      deadline: {
        title: "Stellar Co — final design handoff",
        client: "Stellar Co",
        daysLeft: 2,
      },
      invoice: {
        number: "INV-0148",
        client: "Northwind Studio",
        amount: 4200,
        currency: "USD",
        daysOverdue: 6,
      },
    },

    revenue: buildRevenue(anchor),

    pulse: {
      activity: [
        {
          id: "a1",
          actor: "You",
          action: "marked invoice paid",
          target: "INV-0142 · Lumen Corp",
          relative: "2h ago",
          type: "invoice",
        },
        {
          id: "a2",
          actor: "Anika",
          action: "completed",
          target: "Logo concepts (round 2)",
          relative: "4h ago",
          type: "task",
        },
        {
          id: "a3",
          actor: "Ridwan",
          action: "left a comment on",
          target: "Stellar landing draft",
          relative: "yesterday",
          type: "comment",
        },
        {
          id: "a4",
          actor: "You",
          action: "created project",
          target: "Northwind dashboard v2",
          relative: "yesterday",
          type: "project",
        },
        {
          id: "a5",
          actor: "Mehedi",
          action: "logged 4h on",
          target: "Acme retainer · April",
          relative: "2d ago",
          type: "task",
        },
      ],
      insights: [
        {
          id: "i1",
          kind: "profit",
          title: "Lumen retainer is your most profitable",
          body: "$3,800 net margin in May — up 22% versus last month. Consider proposing an annual extension.",
        },
        {
          id: "i2",
          kind: "risk",
          title: "Stellar Co project nearing budget",
          body: "92% of the budget is consumed with two milestones to go. Flag this in the next sync.",
        },
        {
          id: "i3",
          kind: "alert",
          title: "INV-0148 is 6 days overdue",
          body: "Northwind hasn't viewed the invoice yet. A friendly nudge before week's end is recommended.",
        },
      ],
    },

    stats: {
      activeClients: 14,
      activeClientsDelta: 2,
      activeProjects: 9,
      activeProjectsDelta: -1,
      billableHours: 27,
      billableHoursTarget: 32,
      cashPosition: 28_400,
      retainerMrr: 12_500,
      satisfaction: 92,
      currency: "USD",
    },

    upcoming: buildUpcoming(anchor),
  };
}

function buildRevenue(anchor: Date): RevenueData {
  // Six trailing months ending at the anchor month.
  const months: RevenueData["months"] = [];
  // Fixed deterministic series — sums mimic a growing-but-volatile studio.
  const revenueSeries = [9_400, 11_200, 10_500, 13_800, 16_200, 15_900];
  const expenseSeries = [3_100, 3_400, 3_900, 4_200, 4_600, 4_800];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(anchor);
    d.setMonth(d.getMonth() - i);
    months.push({
      label: MONTH_LABELS[d.getMonth()],
      revenue: revenueSeries[5 - i],
      expense: expenseSeries[5 - i],
    });
  }

  const monthToDate = revenueSeries[5];
  const lastMonth = revenueSeries[4];
  const monthToDateChangePct = Math.round(
    ((monthToDate - lastMonth) / lastMonth) * 100,
  );

  return {
    months,
    monthToDate,
    monthToDateChangePct,
    yearToDate: revenueSeries.reduce((a, b) => a + b, 0),
    currency: "USD",
  };
}

function buildUpcoming(anchor: Date): UpcomingData {
  // Today + 6 days = 7 cells.
  const days: UpcomingData["days"] = [];

  // Deterministic items for each relative-day index.
  const itemBank: Record<number, UpcomingData["days"][number]["items"]> = {
    0: [
      { id: "u-0-1", label: "Lumen design review", kind: "meeting" },
      { id: "u-0-2", label: "Send Q3 status email", kind: "task" },
    ],
    1: [{ id: "u-1-1", label: "Stellar handoff", kind: "deadline" }],
    2: [
      { id: "u-2-1", label: "Northwind 1:1", kind: "meeting" },
      { id: "u-2-2", label: "INV-0149 due", kind: "invoice" },
    ],
    3: [],
    4: [
      { id: "u-4-1", label: "Brand audit · Acme", kind: "task" },
      { id: "u-4-2", label: "Team retro", kind: "meeting" },
    ],
    5: [{ id: "u-5-1", label: "Retainer billing batch", kind: "invoice" }],
    6: [],
  };

  for (let i = 0; i < 7; i++) {
    const d = new Date(anchor);
    d.setDate(d.getDate() + i);
    days.push({
      date: d.toISOString().slice(0, 10),
      weekday: WEEKDAY_LABELS[d.getDay()],
      day: d.getDate(),
      items: itemBank[i] ?? [],
    });
  }

  return { days };
}
