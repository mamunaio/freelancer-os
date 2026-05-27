import {
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Repeat2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { requireOrgContext } from "@/lib/auth/session";
import { Money } from "@/components/money/money";
import { OverviewChart } from "@/components/money/overview-chart";
import { StatTile } from "@/components/money/stat-tile";
import { getMoneyOverview } from "@/features/money/ledger/queries";
import { hasLocale, type Locale } from "@/i18n/routing";

interface PageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Money → Overview.
 *
 * Reads live finance data via `getMoneyOverview()`. Outstanding invoices
 * and retainer MRR are still 0 until 8c/8d ship — that's intentional,
 * `getMoneyOverview` will start populating those once the relevant
 * queries land.
 */
export default async function MoneyOverviewPage({ params }: PageProps) {
  const { locale } = await params;
  const safeLocale: Locale = hasLocale(locale) ? locale : "en";
  setRequestLocale(safeLocale);

  const ctx = await requireOrgContext(safeLocale);

  const t = await getTranslations({
    locale: safeLocale,
    namespace: "Money.overview",
  });

  const data = await getMoneyOverview(ctx.organizationId);

  return (
    <div className="space-y-5">
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
