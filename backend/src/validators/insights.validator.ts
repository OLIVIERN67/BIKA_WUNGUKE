import { z } from 'zod';

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const insightsQuerySchema = z
  .object({
    from: dateString,
    to: dateString,
  })
  .refine((data) => {
    const fromDate = new Date(data.from + 'T00:00:00');
    const toDate = new Date(data.to + 'T00:00:00');
    return fromDate <= toDate;
  }, 'from must be before or equal to to');

export type InsightsQuery = z.infer<typeof insightsQuerySchema>;
