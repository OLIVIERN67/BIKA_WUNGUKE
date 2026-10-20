import { RowDataPacket } from 'mysql2';
import { pool } from '../config/database';

export interface DateRange {
  from: string;
  to: string;
}

export interface PeriodSummary {
  from: string;
  to: string;
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  incomeCount: number;
  expenseCount: number;
  avgDailyIncome: number;
  avgDailyExpense: number;
  transactionCount: number;
}

export interface CategoryBreakdown {
  category_id: number | null;
  category_name: string;
  category_color: string | null;
  total: number;
  count: number;
  percentage: number;
}

export interface ExpenseInsights {
  from: string;
  to: string;
  totalExpense: number;
  breakdown: CategoryBreakdown[];
  topCategories: CategoryBreakdown[];
}

export interface SavingsGoalInsight {
  id: number;
  name: string;
  target_amount: number;
  target_date: string | null;
  deposited: number;
  withdrawn: number;
  contributed: number;
  remaining: number | null;
  progress: number;
  status: string;
}

export interface SavingsInsights {
  balance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  goals: SavingsGoalInsight[];
}

export interface ComparisonData {
  from: string;
  to: string;
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  incomeCount: number;
  expenseCount: number;
}

export interface Warning {
  type: string;
  severity: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  details: Record<string, unknown>;
}

export interface LoanReadinessIndicator {
  name: string;
  status: 'good' | 'needs-improvement' | 'insufficient' | 'neutral';
  description: string;
  value?: unknown;
}

export interface LoanReadinessAssessment {
  summary: {
    from: string;
    to: string;
    hasEnoughHistory: boolean;
    historyDays: number;
  };
  indicators: LoanReadinessIndicator[];
  positiveIndicators: LoanReadinessIndicator[];
  areasForImprovement: LoanReadinessIndicator[];
  missingInformation: string[];
  recommendations: string[];
  disclaimer: string;
}

export interface FinancialInsights {
  period: DateRange;
  summary: PeriodSummary;
  expenseInsights: ExpenseInsights;
  savingsInsights: SavingsInsights;
  warnings: Warning[];
  loanReadiness: LoanReadinessAssessment;
}

function daysBetween(from: string, to: string): number {
  const fromDate = new Date(from + 'T00:00:00');
  const toDate = new Date(to + 'T00:00:00');
  const diff = toDate.getTime() - fromDate.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, days);
}

function safePercentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export async function getPeriodSummary(userId: number, from: string, to: string): Promise<PeriodSummary> {
  const days = daysBetween(from, to);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense,
       COUNT(*) AS txn_count,
       SUM(CASE WHEN type = 'income' THEN 1 ELSE 0 END) AS income_count,
       SUM(CASE WHEN type = 'expense' THEN 1 ELSE 0 END) AS expense_count
     FROM transactions
     WHERE user_id = ? AND txn_date >= ? AND txn_date <= ?`,
    [userId, from, to],
  );
  const row = rows[0] as any;
  const totalIncome = Number(row.total_income || 0);
  const totalExpense = Number(row.total_expense || 0);
  return {
    from,
    to,
    totalIncome,
    totalExpense,
    netCashFlow: totalIncome - totalExpense,
    incomeCount: Number(row.income_count || 0),
    expenseCount: Number(row.expense_count || 0),
    avgDailyIncome: totalIncome / days,
    avgDailyExpense: totalExpense / days,
    transactionCount: Number(row.txn_count || 0),
  };
}

export async function getExpenseInsights(userId: number, from: string, to: string): Promise<ExpenseInsights> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       t.category_id,
       COALESCE(c.name, 'Uncategorized') AS category_name,
       c.color AS category_color,
       COALESCE(SUM(t.amount), 0) AS total,
       COUNT(*) AS count
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = ? AND t.type = 'expense' AND t.txn_date >= ? AND t.txn_date <= ?
     GROUP BY t.category_id, c.name, c.color
     ORDER BY total DESC`,
    [userId, from, to],
  );
  let totalExpense = 0;
  for (const r of rows) {
    totalExpense += Number((r as any).total || 0);
  }
  const breakdown: CategoryBreakdown[] = (rows as any[]).map((r) => {
    const total = Number(r.total || 0);
    const percentage = totalExpense > 0 ? (total / totalExpense) * 100 : 0;
    return {
      category_id: r.category_id ? Number(r.category_id) : null,
      category_name: r.category_name,
      category_color: r.category_color || null,
      total,
      count: Number(r.count || 0),
      percentage,
    };
  });
  return {
    from,
    to,
    totalExpense,
    breakdown,
    topCategories: breakdown.slice(0, 5),
  };
}

export async function getSavingsInsights(userId: number): Promise<SavingsInsights> {
  const [savingsRows] = await pool.query<RowDataPacket[]>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) AS total_deposits,
       COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) AS total_withdrawals
     FROM savings
     WHERE user_id = ?`,
    [userId],
  );
  const srow = savingsRows[0] as any;
  const totalDeposits = Number(srow.total_deposits || 0);
  const totalWithdrawals = Number(srow.total_withdrawals || 0);
  const balance = totalDeposits - totalWithdrawals;

  const [goalRows] = await pool.query<RowDataPacket[]>(
    `SELECT
       g.*,
       COALESCE(SUM(CASE WHEN s.type = 'deposit' THEN s.amount ELSE 0 END), 0) AS deposited,
       COALESCE(SUM(CASE WHEN s.type = 'withdrawal' THEN s.amount ELSE 0 END), 0) AS withdrawn
     FROM savings_goals g
     LEFT JOIN savings s ON s.goal_id = g.id AND s.user_id = g.user_id
     WHERE g.user_id = ?
     GROUP BY g.id
     ORDER BY FIELD(g.status, 'active', 'achieved', 'closed'), g.created_at DESC`,
    [userId],
  );
  const goals: SavingsGoalInsight[] = (goalRows as any[]).map((g) => {
    const deposited = Number(g.deposited || 0);
    const withdrawn = Number(g.withdrawn || 0);
    const contributed = deposited - withdrawn;
    const target = Number(g.target_amount || 0);
    const validTarget = Number.isFinite(target) && target > 0;
    const progress = validTarget ? Math.min(100, Math.max(0, (contributed / target) * 100)) : 0;
    const remaining = validTarget ? Math.max(target - contributed, 0) : null;
    return {
      id: Number(g.id),
      name: g.name,
      target_amount: target,
      target_date: g.target_date || null,
      deposited,
      withdrawn,
      contributed,
      remaining,
      progress: Math.round(progress * 100) / 100,
      status: g.status,
    };
  });
  return { balance, totalDeposits, totalWithdrawals, goals };
}

export async function getComparison(userId: number, from: string, to: string): Promise<ComparisonData> {
  const days = daysBetween(from, to);
  const prevFrom = new Date(from + 'T00:00:00');
  prevFrom.setDate(prevFrom.getDate() - days);
  const prevTo = new Date(from + 'T00:00:00');
  prevTo.setDate(prevTo.getDate() - 1);
  const pfrom = prevFrom.toISOString().slice(0, 10);
  const pto = prevTo.toISOString().slice(0, 10);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense,
       SUM(CASE WHEN type = 'income' THEN 1 ELSE 0 END) AS income_count,
       SUM(CASE WHEN type = 'expense' THEN 1 ELSE 0 END) AS expense_count
     FROM transactions
     WHERE user_id = ? AND txn_date >= ? AND txn_date <= ?`,
    [userId, pfrom, pto],
  );
  const row = rows[0] as any;
  const totalIncome = Number(row.total_income || 0);
  const totalExpense = Number(row.total_expense || 0);
  return {
    from: pfrom,
    to: pto,
    totalIncome,
    totalExpense,
    netCashFlow: totalIncome - totalExpense,
    incomeCount: Number(row.income_count || 0),
    expenseCount: Number(row.expense_count || 0),
  };
}

export async function getHistoryLength(userId: number): Promise<{ days: number; earliest: string | null; latest: string | null }> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT MIN(txn_date) AS earliest, MAX(txn_date) AS latest
     FROM transactions
     WHERE user_id = ?`,
    [userId],
  );
  const row = rows[0] as any;
  if (!row.earliest || !row.latest) return { days: 0, earliest: null, latest: null };
  const e = new Date(String(row.earliest) + 'T00:00:00');
  const l = new Date(String(row.latest) + 'T00:00:00');
  const diff = l.getTime() - e.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  return { days: Math.max(0, days), earliest: String(row.earliest).slice(0, 10), latest: String(row.latest).slice(0, 10) };
}

export function generateWarnings(
  summary: PeriodSummary,
  expenseInsights: ExpenseInsights,
  savingsInsights: SavingsInsights,
  historyDays: number,
): Warning[] {
  const warnings: Warning[] = [];
  if (summary.totalExpense > summary.totalIncome && summary.transactionCount > 0) {
    warnings.push({
      type: 'expenses_exceed_income',
      severity: 'danger',
      title: 'Recorded expenses exceed recorded income',
      message: `In ${summary.from} to ${summary.to}, recorded expenses (${summary.totalExpense.toFixed(2)}) exceed recorded income (${summary.totalIncome.toFixed(2)}) by ${(summary.totalExpense - summary.totalIncome).toFixed(2)}. This is based on recorded transactions only and may not reflect all business factors.`,
      details: { netCashFlow: summary.netCashFlow },
    });
  } else if (summary.netCashFlow < 0 && summary.transactionCount > 0) {
    warnings.push({
      type: 'negative_cash_flow',
      severity: 'warning',
      title: 'Negative net cash flow for this period',
      message: `Net cash flow is ${summary.netCashFlow.toFixed(2)} based on recorded transactions (income minus expenses). Review your records to understand the gap.`,
      details: { netCashFlow: summary.netCashFlow },
    });
  } else if (summary.netCashFlow > 0) {
    warnings.push({
      type: 'positive_cash_flow',
      severity: 'info',
      title: 'Recorded surplus in this period',
      message: `Net cash flow is +${summary.netCashFlow.toFixed(2)} based on recorded transactions. A recorded surplus does not mean all of it is freely available for spending.`,
      details: { netCashFlow: summary.netCashFlow },
    });
  }

  if (expenseInsights.topCategories.length > 0) {
    const top = expenseInsights.topCategories[0];
    if (top.percentage >= 40 && expenseInsights.totalExpense > 0) {
      warnings.push({
        type: 'category_dominant',
        severity: 'info',
        title: 'One category takes a large share of expenses',
        message: `${top.category_name} accounts for ${top.percentage.toFixed(1)}% of recorded expenses in this period. Consider reviewing transactions in this category.`,
        details: { category: top.category_name, percentage: top.percentage },
      });
    }
  }

  for (const g of savingsInsights.goals) {
    if (g.status === 'active' && g.target_date && g.target_amount > 0 && g.contributed >= 0) {
      const today = new Date();
      const tdate = new Date(g.target_date + 'T00:00:00');
      if (tdate < today && g.progress < 100) {
        warnings.push({
          type: 'savings_behind',
          severity: 'warning',
          title: 'Savings goal past target date',
          message: `Goal "${g.name}" had a target date ${g.target_date} but is at ${g.progress.toFixed(1)}% of target. Consider reviewing your plan.`,
          details: { goalId: g.id, progress: g.progress },
        });
      }
    }
  }

  if (summary.transactionCount === 0 || historyDays < 14) {
    warnings.push({
      type: 'insufficient_history',
      severity: 'info',
      title: 'Financial history may be insufficient',
      message: `There are ${summary.transactionCount} transactions in this period and ${historyDays} days of history overall. More records will lead to more reliable insights.`,
      details: { transactionCount: summary.transactionCount, historyDays },
    });
  }

  return warnings;
}

export async function generateLoanReadiness(
  userId: number,
  from: string,
  to: string,
  summary: PeriodSummary,
  savingsInsights: SavingsInsights,
  history: { days: number; earliest: string | null; latest: string | null },
): Promise<LoanReadinessAssessment> {
  const indicators: LoanReadinessIndicator[] = [];
  const missing: string[] = [];

  if (summary.transactionCount > 0) {
    if (summary.incomeCount > 0) {
      const avgIncome = summary.avgDailyIncome;
      indicators.push({
        name: 'Recorded income consistency',
        status: avgIncome >= 0 ? (avgIncome > 0 ? 'good' : 'neutral') : 'neutral',
        description: `Based on ${summary.incomeCount} income records in this period. Higher consistency of recorded income is generally positive.`,
        value: { avgDailyIncome: Number(avgIncome.toFixed(2)), incomeCount: summary.incomeCount },
      });
    } else {
      indicators.push({
        name: 'Recorded income',
        status: 'needs-improvement',
        description: 'No income records found in this period. Lenders typically look for verifiable sources of income.',
      });
    }
  } else {
    missing.push('No transactions in the selected period for assessment');
  }

  if (history.days >= 30) {
    indicators.push({
      name: 'Length of recorded history',
      status: 'good',
      description: `You have ${history.days} days of recorded history. More complete history helps assessment.`,
      value: { historyDays: history.days },
    });
  } else {
    indicators.push({
      name: 'Length of recorded history',
      status: history.days >= 14 ? 'needs-improvement' : 'insufficient',
      description: `You have ${history.days} days of recorded history. Many lenders prefer several months of consistent records.`,
      value: { historyDays: history.days },
    });
    if (history.days < 30) missing.push('Consider recording for at least 30 days to build a stronger history');
  }

  if (summary.totalExpense > summary.totalIncome) {
    indicators.push({
      name: 'Expense-to-income balance',
      status: 'needs-improvement',
      description: 'Recorded expenses exceed recorded income in this period. Reducing expenses or increasing income could help.',
      value: { netCashFlow: summary.netCashFlow },
    });
  } else {
    indicators.push({
      name: 'Expense-to-income balance',
      status: 'good',
      description: 'Recorded income is >= recorded expenses in this period. This is a positive indicator based on records.',
      value: { netCashFlow: summary.netCashFlow },
    });
  }

  const balance = savingsInsights.balance;
  if (balance > 0) {
    indicators.push({
      name: 'Recorded savings balance',
      status: balance >= 5000 ? 'good' : 'needs-improvement',
      description: `You have a recorded savings balance of ${balance.toFixed(2)}. A savings cushion can help manage obligations.`,
      value: { savingsBalance: balance },
    });
  } else {
    indicators.push({
      name: 'Recorded savings balance',
      status: 'needs-improvement',
      description: 'Low or zero recorded savings. Building a small cushion can be helpful before taking on obligations.',
      value: { savingsBalance: balance },
    });
  }

  const positive = indicators.filter((i) => i.status === 'good');
  const areas = indicators.filter((i) => i.status === 'needs-improvement' || i.status === 'insufficient');

  const recommendations = [
    'Keep consistent daily records of income and expenses.',
    'Build and maintain a savings habit.',
    'Compare your records against receipts to improve completeness.',
    'Discuss options with a bank, SACCO, or trusted financial advisor.',
  ];

  if (summary.totalExpense > summary.totalIncome) {
    recommendations.push('Review large expense categories to identify potential cost savings.');
  }
  if (history.days < 30) {
    recommendations.push('Record transactions for more days to strengthen your financial history.');
  }

  return {
    summary: {
      from,
      to,
      hasEnoughHistory: history.days >= 30,
      historyDays: history.days,
    },
    indicators,
    positiveIndicators: positive,
    areasForImprovement: areas,
    missingInformation: missing,
    recommendations,
    disclaimer: 'This is an educational assessment based on recorded transactions only. Banks, SACCOs, or other financial institutions make the final decision. No credit score, approval probability, or loan amount is calculated.',
  };
}

export async function generateFullInsights(userId: number, from: string, to: string): Promise<FinancialInsights> {
  const [summary, expenseInsights, savingsInsights, history] = await Promise.all([
    getPeriodSummary(userId, from, to),
    getExpenseInsights(userId, from, to),
    getSavingsInsights(userId),
    getHistoryLength(userId),
  ]);
  const warnings = generateWarnings(summary, expenseInsights, savingsInsights, history.days);
  const loanReadiness = await generateLoanReadiness(userId, from, to, summary, savingsInsights, history);

  return {
    period: { from, to },
    summary,
    expenseInsights,
    savingsInsights,
    warnings,
    loanReadiness,
  };
}
