import { pool, RowDataPacket } from '../config/database';
import * as dashboardService from './dashboard.service';
import * as savingsService from './savings.service';
import { CategoryBreakdown, TrendPoint } from './dashboard.service';

export interface PeriodRange {
  from: string;
  to: string;
}

export interface PeriodTotals {
  income: number;
  expense: number;
  net: number;
  incomeCount: number;
  expenseCount: number;
  totalCount: number;
}

export interface PeriodComparison {
  period: PeriodRange;
  income: number;
  expense: number;
  net: number;
  incomeCount: number;
  expenseCount: number;
  hasData: boolean;
  deltaIncomePct: number | null;
  deltaExpensePct: number | null;
  deltaNetPct: number | null;
}

export interface PeriodSummary {
  period: PeriodRange & { label: string; days: number };
  totals: PeriodTotals;
  categories: { income: CategoryBreakdown[]; expense: CategoryBreakdown[] };
  topExpenseCategories: CategoryBreakdown[];
  mostFrequentExpenseCategory: CategoryBreakdown | null;
  trend: TrendPoint[];
  previous: PeriodComparison | null;
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000)) + 1;
}

function periodLabel(from: string, to: string): string {
  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  return `${fmt(from)} – ${fmt(to)}`;
}

export function previousRange(from: string, to: string): PeriodRange {
  const days = daysBetween(from, to);
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(days - 1));
  return { from: prevFrom, to: prevTo };
}

async function rangeTotals(userId: number, from: string, to: string): Promise<PeriodTotals> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense,
        COALESCE(SUM(CASE WHEN type = 'income' THEN 1 ELSE 0 END), 0) AS income_count,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN 1 ELSE 0 END), 0) AS expense_count,
        COUNT(*) AS total_count
      FROM transactions
      WHERE user_id = ? AND txn_date >= ? AND txn_date <= ?`,
    [userId, from, to],
  );
  const row = rows[0] as {
    income: number;
    expense: number;
    income_count: number;
    expense_count: number;
    total_count: number;
  };
  const income = Number(row.income);
  const expense = Number(row.expense);
  return {
    income,
    expense,
    net: income - expense,
    incomeCount: Number(row.income_count),
    expenseCount: Number(row.expense_count),
    totalCount: Number(row.total_count),
  };
}

function pctChange(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 10000) / 100;
}

/**
 * Builds a weekly / monthly / custom summary from the user's own records.
 * Every figure is derived from saved transactions only.
 */
export async function periodSummary(
  userId: number,
  range: PeriodRange,
): Promise<PeriodSummary> {
  const { from, to } = range;
  const [totals, incomeCats, expenseCats, trend] = await Promise.all([
    rangeTotals(userId, from, to),
    dashboardService.categoryBreakdown(userId, 'income', from, to),
    dashboardService.categoryBreakdown(userId, 'expense', from, to),
    dashboardService.trend(userId, 30, { from, to }),
  ]);

  const topExpenseCategories = expenseCats.slice(0, 5);
  const byFrequency = [...expenseCats].sort((a, b) => b.count - a.count);
  const mostFrequentExpenseCategory = byFrequency[0] ?? null;

  const prev = previousRange(from, to);
  const prevTotals = await rangeTotals(userId, prev.from, prev.to);
  const hasData = prevTotals.totalCount > 0;
  const previous: PeriodComparison = {
    period: prev,
    income: prevTotals.income,
    expense: prevTotals.expense,
    net: prevTotals.net,
    incomeCount: prevTotals.incomeCount,
    expenseCount: prevTotals.expenseCount,
    hasData,
    deltaIncomePct: hasData ? pctChange(totals.income, prevTotals.income) : null,
    deltaExpensePct: hasData ? pctChange(totals.expense, prevTotals.expense) : null,
    deltaNetPct: hasData ? pctChange(totals.net, prevTotals.net) : null,
  };

  return {
    period: {
      from,
      to,
      label: periodLabel(from, to),
      days: daysBetween(from, to),
    },
    totals,
    categories: { income: incomeCats, expense: expenseCats },
    topExpenseCategories,
    mostFrequentExpenseCategory,
    trend,
    previous,
  };
}

export interface Observation {
  id: string;
  tone: 'info' | 'positive' | 'warning';
  text: string;
  basis: string;
  /** Interpolation values so clients can render localized text by id. */
  params?: Record<string, string | number>;
}

function money(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/**
 * Produces simple, transparent, rule-based observations. Each observation is
 * only returned when the underlying records support it, and includes the data
 * that justifies it. No AI, no invented trends, no advice, no credit scores.
 */
export async function observations(
  userId: number,
  range: PeriodRange,
  currency = 'RWF',
): Promise<Observation[]> {
  const summary = await periodSummary(userId, range);
  const { totals, period, previous, topExpenseCategories, categories } = summary;
  const out: Observation[] = [];

  if (totals.totalCount === 0) {
    out.push({
      id: 'no-records',
      tone: 'info',
      text: `You have not entered any transactions for the selected period (${period.label}).`,
      basis: '0 transactions found in this period.',
      params: { period: period.label },
    });
    return out;
  }

  if (totals.expense > totals.income) {
    out.push({
      id: 'expenses-above-income',
      tone: 'warning',
      text: 'Your recorded expenses were higher than your recorded income for the selected period.',
      basis: `Expenses ${money(totals.expense, currency)} vs income ${money(
        totals.income,
        currency,
      )} across ${totals.totalCount} record(s).`,
      params: {
        expense: money(totals.expense, currency),
        income: money(totals.income, currency),
        count: totals.totalCount,
      },
    });
  } else if (totals.income > totals.expense) {
    out.push({
      id: 'income-above-expenses',
      tone: 'positive',
      text: 'Your recorded income was higher than your recorded expenses for the selected period.',
      basis: `Income ${money(totals.income, currency)} vs expenses ${money(
        totals.expense,
        currency,
      )} across ${totals.totalCount} record(s).`,
      params: {
        income: money(totals.income, currency),
        expense: money(totals.expense, currency),
        count: totals.totalCount,
      },
    });
  }

  const largestExpense = topExpenseCategories[0];
  if (largestExpense && totals.expense > 0) {
    const share = Math.round((largestExpense.total / totals.expense) * 100);
    out.push({
      id: 'largest-expense-category',
      tone: 'info',
      text: `"${largestExpense.category_name}" was your largest recorded expense category for this period.`,
      basis: `${money(largestExpense.total, currency)} across ${
        largestExpense.count
      } record(s), about ${share}% of recorded expenses.`,
      params: {
        category: largestExpense.category_name,
        amount: money(largestExpense.total, currency),
        count: largestExpense.count,
        share,
      },
    });
  }

  const mostFrequent = categories.expense.length
    ? [...categories.expense].sort((a, b) => b.count - a.count)[0]
    : null;
  if (mostFrequent && mostFrequent.count > 1) {
    out.push({
      id: 'most-frequent-expense',
      tone: 'info',
      text: `"${mostFrequent.category_name}" was your most frequent recorded expense category this period.`,
      basis: `${mostFrequent.count} record(s) totalling ${money(mostFrequent.total, currency)}.`,
      params: {
        category: mostFrequent.category_name,
        count: mostFrequent.count,
        total: money(mostFrequent.total, currency),
      },
    });
  }

  if (previous && previous.hasData) {
    if (totals.income > previous.income) {
      out.push({
        id: 'income-up',
        tone: 'positive',
        text: 'You recorded more income in this period than in the previous period of the same length.',
        basis: `This period ${money(totals.income, currency)} vs previous ${money(
          previous.income,
          currency,
        )}.`,
        params: {
          current: money(totals.income, currency),
          previous: money(previous.income, currency),
        },
      });
    } else if (totals.income < previous.income) {
      out.push({
        id: 'income-down',
        tone: 'warning',
        text: 'You recorded less income in this period than in the previous period of the same length.',
        basis: `This period ${money(totals.income, currency)} vs previous ${money(
          previous.income,
          currency,
        )}.`,
        params: {
          current: money(totals.income, currency),
          previous: money(previous.income, currency),
        },
      });
    }
  }

  const goals = await savingsService.listGoals(userId);
  const topGoal = goals
    .filter((g) => g.status !== 'closed' && g.contributed > 0)
    .sort((a, b) => b.progress - a.progress)[0];
  if (topGoal) {
    const pct = topGoal.progress;
    out.push(
      pct >= 100
        ? {
            id: 'savings-reached',
            tone: 'positive' as const,
            text: `You have reached your savings goal "${topGoal.name}".`,
            basis:
              'Based on deposits minus withdrawals recorded against this savings goal. Savings are tracked separately and are not counted as income or expenses.',
            params: { goal: topGoal.name },
          }
        : {
            id: 'savings-progress',
            tone: 'info' as const,
            text: `You have set aside ${money(topGoal.contributed, currency)} towards "${topGoal.name}" (${pct}% of ${money(topGoal.target_amount, currency)}).`,
            basis:
              'Based on deposits minus withdrawals recorded against this savings goal. Savings are tracked separately and are not counted as income or expenses.',
            params: {
              amount: money(topGoal.contributed, currency),
              goal: topGoal.name,
              pct,
              target: money(topGoal.target_amount, currency),
            },
          },
    );
  }

  return out;
}
