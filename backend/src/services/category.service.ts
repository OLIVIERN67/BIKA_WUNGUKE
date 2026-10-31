import { pool, RowDataPacket, ResultSetHeader } from '../config/database';
import { ApiError } from '../utils/api-error';
import { Category } from '../types';
import {
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../validators/category.validator';

const DEFAULT_CATEGORIES: Array<Pick<Category, 'name' | 'type' | 'color'>> = [
  { name: 'Sales (Mauzo)', type: 'income', color: '#16a34a' },
  { name: 'Service income (Serivisi)', type: 'income', color: '#0ea5e9' },
  { name: 'Other income (Izindi nzira)', type: 'income', color: '#8b5cf6' },
  { name: 'Stock and supplies (Ibicuruzwa)', type: 'expense', color: '#ef4444' },
  { name: 'Transport (Ubwikorezi)', type: 'expense', color: '#f97316' },
  { name: 'Rent (Kodesha)', type: 'expense', color: '#a855f7' },
  { name: 'Utilities (Amazi, umuriro, internet)', type: 'expense', color: '#eab308' },
  { name: 'Business equipment (Ibikoresho)', type: 'expense', color: '#ec4899' },
  { name: 'Other costs (Izindi)', type: 'expense', color: '#64748b' },
];

export async function seedDefaultCategories(userId: number): Promise<void> {
  if (DEFAULT_CATEGORIES.length === 0) return;
  const values: unknown[] = [];
  const rows = DEFAULT_CATEGORIES.map((c) => {
    values.push(userId, c.name, c.type, c.color);
    return '(?, ?, ?, ?)';
  });
  await pool.query(
    `INSERT INTO categories (user_id, name, type, color)
     VALUES ${rows.join(', ')}
     ON CONFLICT (user_id, name, type) DO NOTHING`,
    values,
  );
}

export async function list(userId: number, type?: 'income' | 'expense'): Promise<Category[]> {
  const params: unknown[] = [userId];
  let sql = 'SELECT * FROM categories WHERE user_id = ?';
  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }
  sql += ' ORDER BY type ASC, name ASC';
  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  return rows as Category[];
}

export async function getById(userId: number, id: number): Promise<Category> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM categories WHERE id = ? AND user_id = ? LIMIT 1',
    [id, userId],
  );
  const category = rows[0] as Category | undefined;
  if (!category) throw ApiError.notFound('Category not found');
  return category;
}

export async function create(userId: number, input: CreateCategoryInput): Promise<Category> {
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO categories (user_id, name, type, color) VALUES (?, ?, ?, ?) RETURNING id',
    [userId, input.name, input.type, input.color],
  );
  return getById(userId, result.insertId);
}

export async function update(
  userId: number,
  id: number,
  input: UpdateCategoryInput,
): Promise<Category> {
  await getById(userId, id);
  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    fields.push('name = ?');
    values.push(input.name);
  }
  if (input.type !== undefined) {
    fields.push('type = ?');
    values.push(input.type);
  }
  if (input.color !== undefined) {
    fields.push('color = ?');
    values.push(input.color);
  }

  if (fields.length > 0) {
    values.push(id, userId);
    await pool.query(`UPDATE categories SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values);
  }
  return getById(userId, id);
}

export async function remove(userId: number, id: number): Promise<void> {
  await getById(userId, id);
  await pool.query('DELETE FROM categories WHERE id = ? AND user_id = ?', [id, userId]);
}
