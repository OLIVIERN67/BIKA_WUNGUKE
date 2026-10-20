import { z } from 'zod';

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const createGoalSchema = z.object({
  name: z
    .string({ required_error: 'Enter a goal name' })
    .trim()
    .min(1, 'Enter a goal name')
    .max(120, 'Goal name is too long'),
  target_amount: z.coerce
    .number({
      required_error: 'Enter a target amount',
      invalid_type_error: 'Enter a valid target amount',
    })
    .positive('Target amount must be greater than zero')
    .max(999999999999, 'Target amount is too large'),
  target_date: dateString.optional().or(z.literal('')),
  status: z.enum(['active', 'achieved', 'closed']).optional(),
});

export const updateGoalSchema = z.object({
  name: z.string().trim().min(1, 'Enter a goal name').max(120).optional(),
  target_amount: z.coerce
    .number({ invalid_type_error: 'Enter a valid target amount' })
    .positive('Target amount must be greater than zero')
    .max(999999999999, 'Target amount is too large')
    .optional(),
  target_date: dateString.optional().or(z.literal('')).nullable(),
  status: z.enum(['active', 'achieved', 'closed']).optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
