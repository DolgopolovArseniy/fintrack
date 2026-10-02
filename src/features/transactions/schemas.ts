import { z } from 'zod';
import {
  isoDateSchema,
  moneyAmountSchema,
  transactionTypeSchema,
} from '@/lib/schemas';
import { NOTE_MAX_LENGTH, TAGS_MAX_COUNT } from '@/lib/limits';

export const transactionInputSchema = z.object({
  type: transactionTypeSchema,
  amount: moneyAmountSchema,
  accountId: z
    .string({ error: 'validation.required' })
    .min(1, { error: 'validation.required' })
    .max(64, { error: 'validation.tooLong' }),
  categoryId: z
    .string({ error: 'validation.required' })
    .min(1, { error: 'validation.required' })
    .max(64, { error: 'validation.tooLong' }),
  date: isoDateSchema,
  note: z
    .string()
    .max(NOTE_MAX_LENGTH, { error: 'validation.tooLong' })
    .optional(),
  tags: z
    .array(
      z
        .string()
        .min(1, { error: 'validation.required' })
        .max(30, { error: 'validation.tooLong' }),
    )
    .max(TAGS_MAX_COUNT, { error: 'validation.tooLong' })
    .optional(),
});

export const transactionSchema = transactionInputSchema.extend({
  id: z
    .string({ error: 'validation.required' })
    .min(1, { error: 'validation.required' }),
  createdAt: z.date({ error: 'validation.required' }),
  updatedAt: z.date({ error: 'validation.required' }),
});

export type TransactionInput = z.infer<typeof transactionInputSchema>;
export type Transaction = z.infer<typeof transactionSchema>;
