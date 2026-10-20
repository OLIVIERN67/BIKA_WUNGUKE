import { api, unwrap } from './api';
import {
  CategoryBreakdown,
  DashboardSummary,
  SavingsGoal,
  Transaction,
  TransactionType,
  TrendPoint,
} from '../types';

export interface DateRange {
  from?: string;
  to?: string;
}

export function getSummary(range: DateRange = {}): Promise<DashboardSummary> {
  return unwrap(api.get('/dashboard/summary', { params: range }));
}

export function getTrend(days = 30, range: DateRange = {}): Promise<TrendPoint[]> {
  return unwrap(api.get('/dashboard/trend', { params: { days, ...range } }));
}

export function getMonthly(months = 6): Promise<TrendPoint[]> {
  return unwrap(api.get('/dashboard/monthly', { params: { months } }));
}

export function getCategoryBreakdown(
  type: TransactionType = 'expense',
  range: DateRange = {},
): Promise<CategoryBreakdown[]> {
  return unwrap(api.get('/dashboard/categories', { params: { type, ...range } }));
}

export function getRecent(limit = 5): Promise<Transaction[]> {
  return unwrap(api.get('/dashboard/recent', { params: { limit } }));
}

export function getSavingsGoals(): Promise<SavingsGoal[]> {
  return unwrap(api.get('/dashboard/savings-goals'));
}
