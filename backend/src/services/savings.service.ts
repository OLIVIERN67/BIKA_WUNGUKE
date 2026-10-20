import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../config/database';
import { ApiError } from '../utils/api-error';
import { Savings, SavingsGoal, SavingsGoalProgress } from '../types';
import {
  CreateSavingsInput,
  ListSavingsQuery,
  UpdateSavingsInput,
} from '../validators/savings.validator';
import { CreateGoalInput, UpdateGoalInput } from '../validators/goal.validator';
import { Paginated, paginate } from '../utils/response';
import { escapeLike } from '../utils/sql-like';

export async function getById(userId: number, id: number): Promise<Savings> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM savings WHERE id = ? AND user_id = ? LIMIT 1',
    [id, userId],
  );
  const saving = rows[0] as Savings | undefined;
  if (!saving) throw ApiError.notFound('Savings record not found');
  return saving;
}

function normaliseGoalId(value: number | null | '' | undefined): number | null {
  if (value === undefined || value === null || value === '') return null;
  return Number(value);
}

async function assertGoalOwned(userId: number, goalId: number | null): Promise<void> {
  if (goalId === null) return;
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM savings_goals WHERE id = ? AND user_id = ? LIMIT 1',
    [goalId, userId],
  );
  if (rows.length === 0) throw ApiError.badRequest('Invalid savings goal');
}

export async function list(
  userId: number,
  query: ListSavingsQuery,
): Promise<Paginated<Savings>> {
  const where: string[] = ['s.user_id = ?'];
  const params: unknown[] = [userId];

  if (query.type) {
    where.push('s.type = ?');
    params.push(query.type);
  }
  if (query.goal) {
    where.push('s.goal LIKE ?');
    params.push(`%${escapeLike(query.goal)}%`);
  }
  if (query.goal_id) {
    where.push('s.goal_id = ?');
    params.push(query.goal_id);
  }
  if (query.from) {
    where.push('s.saving_date >= ?');
    params.push(query.from);
  }
  if (query.to) {
    where.push('s.saving_date <= ?');
    params.push(query.to);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM savings s ${whereSql}`,
    params,
  );
  const total = Number((countRows[0] as { total: number }).total ?? 0);
  const offset = (query.page - 1) * query.limit;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT s.*, g.name AS goal_name
       FROM savings s
       LEFT JOIN savings_goals g ON g.id = s.goal_id
       ${whereSql}
      ORDER BY s.saving_date DESC, s.id DESC
      LIMIT ? OFFSET ?`,
    [...params, query.limit, offset],
  );

  return paginate(rows as Savings[], total, query.page, query.limit);
}

export async function summary(userId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
        COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) AS total_deposits,
        COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) AS total_withdrawals
      FROM savings WHERE user_id = ?`,
    [userId],
  );
  const row = rows[0] as { total_deposits: number; total_withdrawals: number };
  return {
    total_deposits: Number(row.total_deposits),
    total_withdrawals: Number(row.total_withdrawals),
    balance: Number(row.total_deposits) - Number(row.total_withdrawals),
  };
}

/**
 * Marks an active goal as achieved once its contributions reach the target.
 * Called after any savings write that touches a goal.
 */
async function maybeMarkAchieved(userId: number, goalId: number | null): Promise<void> {
  if (!goalId) return;
  await pool.query(
    `UPDATE savings_goals g
        SET g.status = 'achieved'
      WHERE g.id = ?
        AND g.user_id = ?
        AND g.status = 'active'
        AND g.target_amount > 0
        AND (
          SELECT COALESCE(SUM(CASE WHEN s.type = 'deposit' THEN s.amount ELSE -s.amount END), 0)
            FROM savings s
           WHERE s.goal_id = g.id AND s.user_id = g.user_id
        ) >= g.target_amount`,
    [goalId, userId],
  );
}

export async function create(userId: number, input: CreateSavingsInput): Promise<Savings> {
  const goalId = normaliseGoalId(input.goal_id);
  await assertGoalOwned(userId, goalId);
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO savings (user_id, type, amount, goal, goal_id, note, saving_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.type,
      input.amount,
      input.goal || null,
      goalId,
      input.note || null,
      input.saving_date,
    ],
  );
  await maybeMarkAchieved(userId, goalId);
  return getById(userId, result.insertId);
}

export async function update(
  userId: number,
  id: number,
  input: UpdateSavingsInput,
): Promise<Savings> {
  const before = await getById(userId, id);
  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.type !== undefined) {
    fields.push('type = ?');
    values.push(input.type);
  }
  if (input.amount !== undefined) {
    fields.push('amount = ?');
    values.push(input.amount);
  }
  if (input.goal !== undefined) {
    fields.push('goal = ?');
    values.push(input.goal || null);
  }
  if (input.goal_id !== undefined) {
    const goalId = normaliseGoalId(input.goal_id);
    await assertGoalOwned(userId, goalId);
    fields.push('goal_id = ?');
    values.push(goalId);
  }
  if (input.note !== undefined) {
    fields.push('note = ?');
    values.push(input.note || null);
  }
  if (input.saving_date !== undefined) {
    fields.push('saving_date = ?');
    values.push(input.saving_date);
  }

  if (fields.length > 0) {
    values.push(id, userId);
    await pool.query(`UPDATE savings SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values);
    await maybeMarkAchieved(userId, before.goal_id ?? null);
    await maybeMarkAchieved(userId, normaliseGoalId(input.goal_id));
  }
  return getById(userId, id);
}

export async function remove(userId: number, id: number): Promise<void> {
  const before = await getById(userId, id);
  await pool.query('DELETE FROM savings WHERE id = ? AND user_id = ?', [id, userId]);
  await maybeMarkAchieved(userId, before.goal_id ?? null);
}

/**
 * Computes progress for a goal. Guards against invalid (zero/negative) targets
 * so the maths is always safe: remaining is null and progress is 0 when the
 * target is not a positive number.
 */
export function computeProgress(goal: SavingsGoal, deposited: number, withdrawn: number): SavingsGoalProgress {
  const target = Number(goal.target_amount);
  const contributed = deposited - withdrawn;
  const validTarget = Number.isFinite(target) && target > 0;
  const progress = validTarget ? Math.min(100, Math.max(0, (contributed / target) * 100)) : 0;
  const remaining = validTarget ? Math.max(target - contributed, 0) : null;
  return {
    ...goal,
    target_amount: target,
    deposited,
    withdrawn,
    contributed,
    remaining,
    progress: Math.round(progress * 100) / 100,
    contribution_count: 0,
  };
}

/**
 * Lists all savings goals for a user with their recorded contributions.
 */
export async function listGoals(userId: number): Promise<SavingsGoalProgress[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
        g.*,
        COALESCE(SUM(CASE WHEN s.type = 'deposit' THEN s.amount ELSE 0 END), 0) AS deposited,
        COALESCE(SUM(CASE WHEN s.type = 'withdrawal' THEN s.amount ELSE 0 END), 0) AS withdrawn,
        COUNT(s.id) AS contribution_count
       FROM savings_goals g
       LEFT JOIN savings s ON s.goal_id = g.id AND s.user_id = g.user_id
      WHERE g.user_id = ?
      GROUP BY g.id
      ORDER BY FIELD(g.status, 'active', 'achieved', 'closed'), g.created_at DESC`,
    [userId],
  );

  return (rows as RowDataPacket[]).map((row) => {
    const goal = row as unknown as SavingsGoal;
    const progress = computeProgress(goal, Number(row.deposited), Number(row.withdrawn));
    progress.contribution_count = Number(row.contribution_count);
    return progress;
  });
}

export async function getGoal(userId: number, id: number): Promise<SavingsGoalProgress> {
  const goals = await listGoals(userId);
  const goal = goals.find((g) => g.id === id);
  if (!goal) throw ApiError.notFound('Savings goal not found');
  return goal;
}

export async function createGoal(userId: number, input: CreateGoalInput): Promise<SavingsGoalProgress> {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO savings_goals (user_id, name, target_amount, target_date, status)
     VALUES (?, ?, ?, ?, ?)`,
    [
      userId,
      input.name,
      input.target_amount,
      input.target_date || null,
      input.status || 'active',
    ],
  );
  return getGoal(userId, result.insertId);
}

export async function updateGoal(
  userId: number,
  id: number,
  input: UpdateGoalInput,
): Promise<SavingsGoalProgress> {
  const existing = await getGoal(userId, id);
  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    fields.push('name = ?');
    values.push(input.name);
  }
  if (input.target_amount !== undefined) {
    fields.push('target_amount = ?');
    values.push(input.target_amount);
  }
  if (input.target_date !== undefined) {
    fields.push('target_date = ?');
    values.push(input.target_date || null);
  }
  if (input.status !== undefined) {
    fields.push('status = ?');
    values.push(input.status);
  }

  if (fields.length > 0) {
    values.push(id, userId);
    await pool.query(
      `UPDATE savings_goals SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values,
    );
  }

  // Auto-mark an active goal as achieved once contributions reach the target.
  const updated = await getGoal(userId, id);
  if (
    updated.status === 'active' &&
    updated.remaining !== null &&
    updated.remaining <= 0 &&
    existing.status === 'active'
  ) {
    await pool.query("UPDATE savings_goals SET status = 'achieved' WHERE id = ? AND user_id = ?", [
      id,
      userId,
    ]);
    return getGoal(userId, id);
  }
  return updated;
}

export async function removeGoal(userId: number, id: number): Promise<void> {
  await getGoal(userId, id);
  await pool.query('DELETE FROM savings_goals WHERE id = ? AND user_id = ?', [id, userId]);
}
