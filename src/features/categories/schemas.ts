import { z } from 'zod';
import { transactionTypeSchema } from '@/lib/schemas';
import { NAME_MAX_LENGTH, SYSTEM_KEY_MAX_LENGTH } from '@/lib/limits';
import { CATEGORY_COLOR_KEYS } from './constants';

export const categoryColorSchema = z.enum(CATEGORY_COLOR_KEYS, {
  error: () => 'validation.required',
});

function hasNameOrSystemKey(data: {
  name?: string;
  systemKey?: string;
}): boolean {
  const hasName = typeof data.name === 'string' && data.name.trim().length > 0;
  const hasSystemKey =
    typeof data.systemKey === 'string' && data.systemKey.trim().length > 0;
  return hasName || hasSystemKey;
}

const baseCategorySchema = z.object({
  type: transactionTypeSchema,
  icon: z
    .string({ error: 'validation.required' })
    .min(1, { error: 'validation.required' })
    .max(NAME_MAX_LENGTH, { error: 'validation.tooLong' }),
  color: categoryColorSchema,
  archived: z.boolean().default(false),
  name: z
    .string()
    .min(1, { error: 'validation.required' })
    .max(NAME_MAX_LENGTH, { error: 'validation.tooLong' })
    .optional(),
  systemKey: z
    .string()
    .min(1, { error: 'validation.required' })
    .max(SYSTEM_KEY_MAX_LENGTH, { error: 'validation.tooLong' })
    .optional(),
});

export const categoryInputSchema = baseCategorySchema.refine(
  hasNameOrSystemKey,
  {
    error: 'validation.required',
    path: ['name'],
  },
);

const baseCategoryDocSchema = baseCategorySchema.extend({
  id: z
    .string({ error: 'validation.required' })
    .min(1, { error: 'validation.required' }),
  archived: z.boolean({ error: 'validation.required' }),
  createdAt: z.date({ error: 'validation.required' }),
  updatedAt: z.date({ error: 'validation.required' }),
});

export const categorySchema = baseCategoryDocSchema.refine(hasNameOrSystemKey, {
  error: 'validation.required',
  path: ['name'],
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type Category = z.infer<typeof categorySchema>;
