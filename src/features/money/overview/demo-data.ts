import type { MoneyOverview } from "../types";

/**
 * Deterministic demo numbers powering the Money → Overview tab in
 * sub-phase 8a.
 *
 * Replaced by `getMoneyOverview()` against MongoDB in 8b once the ledger
 * exists. Kept on file (not deleted) so screenshots, design reviews, and
 * the Storybook-style fixture remain reproducible.
 */
export function buildMoneyOverviewDemo(anchor: Date): MoneyOverview {
  const monthLabels = [
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

  // Fixed series — six months ending at anchor.
  const incomes = [9_400, 11_200, 10_500, 13_800, 16_200, 15_900];
  const expenses = [3_100, 3_400, 3_900, 4_200, 4_600, 4_800];

  const series = incomes.map((income, i) => {
    const d = new Date(anchor);
    d.setMonth(d.getMonth() - (5 - i));
    return {
      label: monthLabels[d.getMonth()],
      income,
      expense: expenses[i],
    };
  });

  const monthIncome = incomes[5];
  const monthExpense = expenses[5];

  return {
    monthIncome,
    monthExpense,
    monthNet: monthIncome - monthExpense,
    outstandingInvoicesUsd: 8_400,
    outstandingInvoicesCount: 3,
    retainerMrrUsd: 12_500,
    series,
  };
}
