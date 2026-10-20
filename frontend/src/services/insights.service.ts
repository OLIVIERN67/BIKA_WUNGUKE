import { api, unwrap } from './api';

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

export interface Warning {
  type: string;
  severity: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  details: Record<string, unknown>;
}

export interface LoanReadinessAssessment {
  summary: {
    from: string;
    to: string;
    hasEnoughHistory: boolean;
    historyDays: number;
  };
  indicators: Array<{
    name: string;
    status: 'good' | 'needs-improvement' | 'insufficient' | 'neutral';
    description: string;
    value?: unknown;
  }>;
  positiveIndicators: any[];
  areasForImprovement: any[];
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

export function getSummary(from: string, to: string): Promise<FinancialInsights> {
  return unwrap(api.get('/insights/summary', { params: { from, to } }));
}

export function getExpenses(from: string, to: string): Promise<any> {
  return unwrap(api.get('/insights/expenses', { params: { from, to } }));
}

export function getSavings(): Promise<SavingsInsights> {
  return unwrap(api.get('/insights/savings'));
}

export function getLoanReadiness(from: string, to: string): Promise<LoanReadinessAssessment> {
  return unwrap(api.get('/insights/loan-readiness', { params: { from, to } }));
}
