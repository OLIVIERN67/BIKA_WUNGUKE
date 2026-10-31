import { pool, RowDataPacket } from '../config/database';
import { TransactionWithCategory } from './transaction.service';

export interface DashboardRange {
  from?: string;
  to?: string;
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
  type: 'income' | 'expense';
  total: number;
  count: number;
}

function localISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayISO(): string {
  return localISO(new Date());
}

function firstOfMonthISO(): string {
  const d = new Date();
  return localISO(new Date(d.getFullYear(), d.getMonth(), 1));
}

export async function summary(userId: number, range: DashboardRange = {}): Promise<DashboardSummary> {
  const where = ['user_id = ?'];
  const params: unknown[] = [userId];
  if (range.from) {
    where.push('txn_date >= ?');
    params.push(range.from);
  }
  if (range.to) {
    where.push('txn_date <= ?');
    params.push(range.to);
  }
  const whereSql = where.join(' AND ');

  const [totalsRows] = await pool.query<RowDataPacket[]>(
    `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense,
        COUNT(*) AS txn_count
      FROM transactions WHERE ${whereSql}`,
    params,
  );
  const totals = totalsRows[0] as {
    total_income: number;
    total_expense: number;
    txn_count: number;
  };

  const [todayRows] = await pool.query<RowDataPacket[]>(
    `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
      FROM transactions WHERE user_id = ? AND txn_date = ?`,
    [userId, todayISO()],
  );
  const today = todayRows[0] as { income: number; expense: number };

  const [monthRows] = await pool.query<RowDataPacket[]>(
    `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
      FROM transactions WHERE user_id = ? AND txn_date >= ?`,
    [userId, firstOfMonthISO()],
  );
  const month = monthRows[0] as { income: number; expense: number };

  const [savingsRows] = await pool.query<RowDataPacket[]>(
    `SELECT
        COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) AS deposits,
        COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) AS withdrawals
      FROM savings WHERE user_id = ?`,
    [userId],
  );
  const savings = savingsRows[0] as { deposits: number; withdrawals: number };
  const goals = await savingsGoals(userId);

  const totalIncome = Number(totals.total_income);
  const totalExpense = Number(totals.total_expense);
  const savingsBalance = Number(savings.deposits) - Number(savings.withdrawals);

  return {
    totalIncome,
    totalExpense,
    netCashFlow: totalIncome - totalExpense,
    transactionCount: Number(totals.txn_count),
    savingsBalance,
    savings: {
      balance: savingsBalance,
      deposits: Number(savings.deposits),
      withdrawals: Number(savings.withdrawals),
      goals,
    },
    period: { from: range.from ?? null, to: range.to ?? null },
    today: { income: Number(today.income), expense: Number(today.expense) },
    thisMonth: {
      income: Number(month.income),
      expense: Number(month.expense),
      net: Number(month.income) - Number(month.expense),
    },
  };
}

/**
 * Savings grouped by goal, showing deposits, withdrawals and net per goal.
 */
export async function savingsGoals(userId: number): Promise<SavingsGoal[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
        COALESCE(NULLIF(goal, ''), 'General savings') AS goal,
        COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) AS deposited,
        COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) AS withdrawn
      FROM savings
      WHERE user_id = ?
      GROUP BY COALESCE(NULLIF(goal, ''), 'General savings')
      ORDER BY deposited DESC`,
    [userId],
  );
  return (rows as RowDataPacket[]).map((row) => {
    const deposited = Number(row.deposited);
    const withdrawn = Number(row.withdrawn);
    return {
      goal: String(row.goal),
      deposited,
      withdrawn,
      net: deposited - withdrawn,
    };
  });
}

/**
 * Latest transactions for the recent-activity list.
 */
export async function recentTransactions(
  userId: number,
  limit = 5,
): Promise<TransactionWithCategory[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT t.*, c.name AS category_name, c.color AS category_color
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
      WHERE t.user_id = ?
      ORDER BY t.txn_date DESC, t.id DESC
      LIMIT ?`,
    [userId, safeLimit],
  );
  return rows as TransactionWithCategory[];
}

/**
 * Daily cash-flow trend. Uses the provided `from`/`to` range, or the last
 * `days` days when no range is given.
 */
export async function trend(
  userId: number,
  days = 30,
  range: DashboardRange = {},
): Promise<TrendPoint[]> {
  const safeDays = Math.min(Math.max(days, 1), 365);

  // Boundaries are ISO strings (UTC calendar days), so all maths below
  // happens in UTC to keep the labels stable regardless of server timezone.
  const endISO = range.to ?? todayISO();
  let startISO: string;
  if (range.from) {
    startISO = range.from;
  } else {
    const d = new Date(`${endISO}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (safeDays - 1));
    startISO = d.toISOString().slice(0, 10);
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
        txn_date AS date,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
      FROM transactions
      WHERE user_id = ? AND txn_date >= ? AND txn_date <= ?
      GROUP BY txn_date
      ORDER BY txn_date ASC`,
    [userId, startISO, endISO],
  );

  const map = new Map<string, { income: number; expense: number }>();
  for (const row of rows as Array<{ date: string; income: number; expense: number }>) {
    map.set(String(row.date).slice(0, 10), {
      income: Number(row.income),
      expense: Number(row.expense),
    });
  }

  const points: TrendPoint[] = [];
  const cursor = new Date(`${startISO}T00:00:00Z`);
  const last = new Date(`${endISO}T00:00:00Z`);
  let guard = 0;
  while (cursor <= last && guard < 1500) {
    const key = cursor.toISOString().slice(0, 10);
    const entry = map.get(key) ?? { income: 0, expense: 0 };
    points.push({
      label: key,
      income: entry.income,
      expense: entry.expense,
      net: entry.income - entry.expense,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    guard += 1;
  }
  return points;
}

export async function categoryBreakdown(
  userId: number,
  type: 'income' | 'expense',
  from?: string,
  to?: string,
): Promise<CategoryBreakdown[]> {
  const where = ['t.user_id = ?', 't.type = ?'];
  const params: unknown[] = [userId, type];
  if (from) {
    where.push('t.txn_date >= ?');
    params.push(from);
  }
  if (to) {
    where.push('t.txn_date <= ?');
    params.push(to);
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
        t.category_id,
        COALESCE(c.name, 'Uncategorised') AS category_name,
        COALESCE(c.color, '#94a3b8') AS color,
        t.type,
        SUM(t.amount) AS total,
        COUNT(*) AS count
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      WHERE ${where.join(' AND ')}
      GROUP BY t.category_id, COALESCE(c.name, 'Uncategorised'), COALESCE(c.color, '#94a3b8'), t.type
      ORDER BY total DESC`,
    params,
  );

  return (rows as Array<RowDataPacket>).map((row) => ({
    category_id: row.category_id as number | null,
    category_name: String(row.category_name),
    color: String(row.color),
    type: row.type as 'income' | 'expense',
    total: Number(row.total),
    count: Number(row.count),
  }));
}

export async function monthly(userId: number, months = 6): Promise<TrendPoint[]> {
  const safeMonths = Math.min(Math.max(months, 1), 24);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
        TO_CHAR(txn_date, 'YYYY-MM') AS ym,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
      FROM transactions
      WHERE user_id = ?
        AND txn_date >= date_trunc('month', CURRENT_DATE) - make_interval(months => ?)
      GROUP BY TO_CHAR(txn_date, 'YYYY-MM')
      ORDER BY ym ASC`,
    [userId, safeMonths - 1],
  );

  const map = new Map<string, { income: number; expense: number }>();
  for (const row of rows as Array<{ ym: string; income: number; expense: number }>) {
    map.set(row.ym, { income: Number(row.income), expense: Number(row.expense) });
  }

  const points: TrendPoint[] = [];
  const now = new Date();
  for (let i = safeMonths - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const entry = map.get(key) ?? { income: 0, expense: 0 };
    points.push({
      label: key,
      income: entry.income,
      expense: entry.expense,
      net: entry.income - entry.expense,
    });
  }
  return points;
}
