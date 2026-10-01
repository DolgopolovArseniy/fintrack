import { z } from 'zod';
import { moneyAmountSchema, yearMonthSchema } from '@/lib/schemas';

export const budgetInputSchema = z.object({
  categoryId: z
    .string({ error: 'validation.required' })
    .min(1, { error: 'validation.required' })
    .max(64, { error: 'validation.tooLong' }),
  month: yearMonthSchema,
  limit: moneyAmountSchema,
});

const baseBudgetDocSchema = budgetInputSchema.extend({
  id: z
    .string({ error: 'validation.required' })
    .min(1, { error: 'validation.required' }),
  createdAt: z.date({ error: 'validation.required' }),
  updatedAt: z.date({ error: 'validation.required' }),
});

export const budgetSchema = baseBudgetDocSchema.refine(
  (doc) => doc.id === `${doc.month}_${doc.categoryId}`,
  {
    error: 'validation.required',
    path: ['id'],
  },
);

export type BudgetInput = z.infer<typeof budgetInputSchema>;
export type Budget = z.infer<typeof budgetSchema>;
