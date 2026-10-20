export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'cash' | 'mobile_money' | 'bank' | 'credit' | 'other';
export type SavingsType = 'deposit' | 'withdrawal';
export type SavingsGoalStatus = 'active' | 'achieved' | 'closed';

export interface User {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  password_hash: string;
  business_name: string | null;
  business_type: string | null;
  business_location: string | null;
  business_description: string | null;
  currency: string;
  locale: string;
  email_verified: number;
  token_version: number;
  created_at: Date;
  updated_at: Date;
}

export type PublicUser = Omit<User, 'password_hash' | 'token_version'>;

export interface Category {
  id: number;
  user_id: number;
  name: string;
  type: TransactionType;
  color: string;
  created_at: Date;
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
  created_at: Date;
  updated_at: Date;
}

export interface Savings {
  id: number;
  user_id: number;
  type: SavingsType;
  amount: number;
  goal: string | null;
  goal_id: number | null;
  note: string | null;
  saving_date: string;
  created_at: Date;
  updated_at: Date;
}

export interface SavingsGoal {
  id: number;
  user_id: number;
  name: string;
  target_amount: number;
  target_date: string | null;
  status: SavingsGoalStatus;
  created_at: Date;
  updated_at: Date;
}

export interface SavingsGoalProgress extends SavingsGoal {
  deposited: number;
  withdrawn: number;
  contributed: number;
  remaining: number | null;
  progress: number;
  contribution_count: number;
}

export interface AuthTokenPayload {
  sub: number;
  phone: string;
  /** users.token_version at issue time - bumped on password change/reset. */
  tv: number;
}

export interface JwtUser {
  id: number;
  phone: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
    }
  }
}
