import { z } from 'zod';

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive('Amount must be greater than zero').max(999999999999),
  category_id: z.coerce
    .number({ required_error: 'Please choose a category', invalid_type_error: 'Please choose a category' })
    .int()
    .positive('Please choose a category'),
  description: z.string().trim().max(255).optional().or(z.literal('')),
  payment_method: z
    .enum(['cash', 'mobile_money', 'bank', 'credit', 'other'])
    .default('cash'),
  txn_date: dateString,
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const listTransactionQuerySchema = z.object({
  type: z.enum(['income', 'expense']).optional(),
  category_id: z.coerce.number().int().positive().optional(),
  from: dateString.optional(),
  to: dateString.optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
  sort: z.enum(['txn_date', 'amount', 'created_at']).default('txn_date'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionQuery = z.infer<typeof listTransactionQuerySchema>;
