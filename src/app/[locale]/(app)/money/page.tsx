import {
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Repeat2,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { requireOrgContext } from "@/lib/auth/session";
import { Money } from "@/components/money/money";
import { OverviewChart } from "@/components/money/overview-chart";
import { StatTile } from "@/components/money/stat-tile";
import { buildMoneyOverviewDemo } from "@/features/money/overview/demo-data";
import { hasLocale, type Locale } from "@/i18n/routing";

interface PageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Money → Overview (sub-phase 8a).
 *
 * Renders KPI tiles + the income/expense chart against demo numbers.
 * The numbers are deterministic (anchored to `now`) so screenshots stay
 * stable across runs. 8b replaces this with `getMoneyOverview()` reading
 * from MongoDB.
 */
export default async function MoneyOverviewPage({ params }: PageProps) {
  const { locale } = await params;
  const safeLocale: Locale = hasLocale(locale) ? locale : "en";
  setRequestLocale(safeLocale);

  // Permission already enforced by the layout — re-derive only for the
  // role-aware copy below if we need it later.
  await requireOrgContext(safeLocale);

  const t = await getTranslations({
    locale: safeLocale,
    namespace: "Money.overview",
  });

  const data = buildMoneyOverviewDemo(new Date());

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2.5 rounded-lg border border-[hsl(var(--info))]/30 bg-[hsl(var(--info))]/8 px-3 py-2 text-[11px] text-[hsl(var(--info))]">
        <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
        <p>
          <span className="font-semibold">{t("demoBadge")}.</span>{" "}
          <span className="text-[hsl(var(--foreground))]/80">
            {t("demoNotice")}
          </span>
        </p>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile
          icon={Wallet}
          label={t("stats.net")}
          value={
            <Money amount={data.monthNet} currency="USD" compact noTooltip />
          }
          variant="tinted"
          tint={data.monthNet >= 0 ? "success" : "danger"}
        />
        <StatTile
          icon={ArrowDownLeft}
          label={t("stats.income")}
          value={
            <Money
              amount={data.monthIncome}
              currency="USD"
              compact
              noTooltip
            />
          }
          variant="tinted"
          tint="primary"
        />
        <StatTile
          icon={ArrowUpRight}
          label={t("stats.expense")}
          value={
            <Money
              amount={data.monthExpense}
              currency="USD"
              compact
              noTooltip
            />
          }
        />
        <StatTile
          icon={Receipt}
          label={t("stats.outstanding")}
          value={
            <Money
              amount={data.outstandingInvoicesUsd}
              currency="USD"
              compact
              noTooltip
            />
          }
          hint={t("stats.outstandingHint", {
            count: data.outstandingInvoicesCount,
          })}
          variant="tinted"
          tint="warning"
        />
        <StatTile
          icon={Repeat2}
          label={t("stats.mrr")}
          value={
            <Money
              amount={data.retainerMrrUsd}
              currency="USD"
              compact
              noTooltip
            />
          }
        />
      </section>

      <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-5">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">
              {t("chart.title")}
            </h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {t("chart.subtitle")}
            </p>
          </div>
          <TrendingUp className="h-4 w-4 text-[hsl(var(--muted-foreground))]/50" />
        </header>

        <OverviewChart
          series={data.series}
          incomeLabel={t("chart.income")}
          expenseLabel={t("chart.expense")}
        />

        <div className="mt-3 flex items-center justify-end gap-4 text-[11px] text-[hsl(var(--muted-foreground))]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />
            {t("chart.income")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[hsl(var(--muted-foreground))]/60" />
            {t("chart.expense")}
          </span>
        </div>
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
