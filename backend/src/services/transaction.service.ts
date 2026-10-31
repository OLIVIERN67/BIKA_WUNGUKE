import { pool, RowDataPacket, ResultSetHeader } from '../config/database';
import { ApiError } from '../utils/api-error';
import { Transaction } from '../types';
import {
  CreateTransactionInput,
  ListTransactionQuery,
  UpdateTransactionInput,
} from '../validators/transaction.validator';
import { Paginated, paginate } from '../utils/response';
import { escapeLike } from '../utils/sql-like';

export interface TransactionWithCategory extends Transaction {
  category_name: string | null;
  category_color: string | null;
}

async function assertCategoryOwnership(
  userId: number,
  categoryId: number | null | undefined,
): Promise<void> {
  if (categoryId === null || categoryId === undefined) return;
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM categories WHERE id = ? AND user_id = ? LIMIT 1',
    [categoryId, userId],
  );
  if (rows.length === 0) throw ApiError.badRequest('Selected category does not exist.');
}

export async function getById(
  userId: number,
  id: number,
): Promise<TransactionWithCategory> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT t.*, c.name AS category_name, c.color AS category_color
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
      WHERE t.id = ? AND t.user_id = ?
      LIMIT 1`,
    [id, userId],
  );
  const txn = rows[0] as TransactionWithCategory | undefined;
  if (!txn) throw ApiError.notFound('Transaction not found');
  return txn;
}

export async function list(
  userId: number,
  query: ListTransactionQuery,
): Promise<Paginated<TransactionWithCategory>> {
  const where: string[] = ['t.user_id = ?'];
  const params: unknown[] = [userId];

  if (query.type) {
    where.push('t.type = ?');
    params.push(query.type);
  }
  if (query.category_id) {
    where.push('t.category_id = ?');
    params.push(query.category_id);
  }
  if (query.from) {
    where.push('t.txn_date >= ?');
    params.push(query.from);
  }
  if (query.to) {
    where.push('t.txn_date <= ?');
    params.push(query.to);
  }
  if (query.search) {
    where.push('t.description LIKE ?');
    params.push(`%${escapeLike(query.search)}%`);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const sortColumn = `t.${query.sort}`;
  const order = query.order === 'asc' ? 'ASC' : 'DESC';

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM transactions t ${whereSql}`,
    params,
  );
  const total = Number((countRows[0] as { total: number }).total ?? 0);

  const offset = (query.page - 1) * query.limit;
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT t.*, c.name AS category_name, c.color AS category_color
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       ${whereSql}
       ORDER BY ${sortColumn} ${order}, t.id DESC
       LIMIT ? OFFSET ?`,
    [...params, query.limit, offset],
  );

  return paginate(rows as TransactionWithCategory[], total, query.page, query.limit);
}

export async function create(
  userId: number,
  input: CreateTransactionInput,
): Promise<TransactionWithCategory> {
  await assertCategoryOwnership(userId, input.category_id ?? null);

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO transactions
       (user_id, category_id, type, amount, description, payment_method, txn_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     RETURNING id`,
    [
      userId,
      input.category_id ?? null,
      input.type,
      input.amount,
      input.description || null,
      input.payment_method,
      input.txn_date,
    ],
  );
  return getById(userId, result.insertId);
}

export async function update(
  userId: number,
  id: number,
  input: UpdateTransactionInput,
): Promise<TransactionWithCategory> {
  await getById(userId, id);
  if (input.category_id !== undefined) {
    await assertCategoryOwnership(userId, input.category_id);
  }

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
  if (input.category_id !== undefined) {
    fields.push('category_id = ?');
    values.push(input.category_id);
  }
  if (input.description !== undefined) {
    fields.push('description = ?');
    values.push(input.description || null);
  }
  if (input.payment_method !== undefined) {
    fields.push('payment_method = ?');
    values.push(input.payment_method);
  }
  if (input.txn_date !== undefined) {
    fields.push('txn_date = ?');
    values.push(input.txn_date);
  }

  if (fields.length > 0) {
    values.push(id, userId);
    await pool.query(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values);
  }
  return getById(userId, id);
}

export async function remove(userId: number, id: number): Promise<void> {
  await getById(userId, id);
  await pool.query('DELETE FROM transactions WHERE id = ? AND user_id = ?', [id, userId]);
}
