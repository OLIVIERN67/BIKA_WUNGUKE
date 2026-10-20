export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'cash' | 'mobile_money' | 'bank' | 'credit' | 'other';
export type SavingsType = 'deposit' | 'withdrawal';
export type SavingsGoalStatus = 'active' | 'achieved' | 'closed';

export interface User {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  business_name: string | null;
  business_type: string | null;
  business_location: string | null;
  business_description: string | null;
  currency: string;
  locale: string;
  email_verified: number;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * Login outcome. Either the account is authenticated and receives a session
 * token, or — when the email is not yet verified — the backend emails a fresh
 * OTP and returns `verificationRequired` instead of a token.
 */
export interface LoginVerificationRequired {
  user: User;
  verificationRequired: true;
  otpSent: boolean;
  maskedEmail: string | null;
}

export type LoginResult = AuthResponse | LoginVerificationRequired;

export function isVerificationRequired(
  result: LoginResult,
): result is LoginVerificationRequired {
  return 'verificationRequired' in result && result.verificationRequired === true;
}

export interface RegisterResponse {
  user: User;
  verificationRequired: boolean;
  otpSent: boolean;
}

export interface Category {
  id: number;
  user_id: number;
  name: string;
  type: TransactionType;
  color: string;
  created_at: string;
}

export interface Transaction {
  id: number;
  user_id: number;
  category_id: number | null;
  type: TransactionType;
  amount: number;
  description: string | null;
  payment_method: PaymentMethod;
  txn_date: string;
  category_name: string | null;
  category_color: string | null;
  created_at: string;
  updated_at: string;
}

export interface Savings {
  id: number;
  user_id: number;
  type: SavingsType;
  amount: number;
  goal: string | null;
  goal_id: number | null;
  goal_name?: string | null;
  note: string | null;
  saving_date: string;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoalRecord {
  id: number;
  user_id: number;
  name: string;
  target_amount: number;
  target_date: string | null;
  status: SavingsGoalStatus;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoalProgress extends SavingsGoalRecord {
  deposited: number;
  withdrawn: number;
  contributed: number;
  remaining: number | null;
  progress: number;
  contribution_count: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface SavingsGoal {
  goal: string;
  deposited: number;
  withdrawn: number;
  net: number;
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  transactionCount: number;
  savingsBalance: number;
  savings: {
    balance: number;
    deposits: number;
    withdrawals: number;
    goals: SavingsGoal[];
  };
  period: { from: string | null; to: string | null };
  today: { income: number; expense: number };
  thisMonth: { income: number; expense: number; net: number };
}

export interface TrendPoint {
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface CategoryBreakdown {
  category_id: number | null;
  category_name: string;
  color: string;
  type: TransactionType;
  total: number;
  count: number;
}

export interface SavingsSummary {
  total_deposits: number;
  total_withdrawals: number;
  balance: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface ReportTotals {
  income: number;
  expense: number;
  net: number;
  count: number;
}

export interface ReportPayload {
  rows: Transaction[];
  totals: ReportTotals;
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
  period: { from: string; to: string };
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
  period: { from: string; to: string; label: string; days: number };
  totals: PeriodTotals;
  categories: { income: CategoryBreakdown[]; expense: CategoryBreakdown[] };
  topExpenseCategories: CategoryBreakdown[];
  mostFrequentExpenseCategory: CategoryBreakdown | null;
  trend: TrendPoint[];
  previous: PeriodComparison | null;
}

export interface Observation {
  id: string;
  tone: 'info' | 'positive' | 'warning';
  text: string;
  basis: string;
  /** Interpolation values for localized rendering by id. */
  params?: Record<string, string | number>;
}
