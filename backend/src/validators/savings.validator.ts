import { z } from 'zod';

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

const goalId = z
  .union([
    z.coerce.number().int().positive('Invalid savings goal'),
    z.null(),
    z.literal(''),
  ])
  .optional();

export const createSavingsSchema = z.object({
  type: z.enum(['deposit', 'withdrawal']),
  amount: z.coerce.number().positive('Amount must be greater than zero').max(999999999999),
  goal: z.string().trim().max(120).optional().or(z.literal('')),
  goal_id: goalId,
  note: z.string().trim().max(255).optional().or(z.literal('')),
  saving_date: dateString,
});

export const updateSavingsSchema = createSavingsSchema.partial();

export const listSavingsQuerySchema = z.object({
  type: z.enum(['deposit', 'withdrawal']).optional(),
  goal: z.string().trim().max(120).optional(),
  goal_id: z.coerce.number().int().positive().optional(),
  from: dateString.optional(),
  to: dateString.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
});

export type CreateSavingsInput = z.infer<typeof createSavingsSchema>;
export type UpdateSavingsInput = z.infer<typeof updateSavingsSchema>;
export type ListSavingsQuery = z.infer<typeof listSavingsQuerySchema>;
