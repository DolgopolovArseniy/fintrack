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

export const budgetUpdateInputSchema = z.object({
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
export type BudgetUpdateInput = z.infer<typeof budgetUpdateInputSchema>;
export type Budget = z.infer<typeof budgetSchema>;

export type BudgetStatus = 'normal' | 'warning' | 'exceeded';

export interface EnrichedBudget {
  id: string;
  categoryId: string;
  month: string;
  limit: number;
  spent: number;
  remaining: number;
  overspent: number;
  progress: number; // 0..100+
  status: BudgetStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetSummaryTotals {
  totalLimit: number;
  totalSpent: number;
  totalRemaining: number;
  totalOverspent: number;
  overallProgress: number;
  overallStatus: BudgetStatus;
  budgetCount: number;
  normalCount: number;
  warningCount: number;
  exceededCount: number;
}
