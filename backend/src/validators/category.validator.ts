import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  type: z.enum(['income', 'expense']),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #10b981')
    .default('#10b981'),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
