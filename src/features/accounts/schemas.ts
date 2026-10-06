import { z } from 'zod';
import {
  MAX_BALANCE,
  NAME_MAX_LENGTH,
  SYSTEM_KEY_MAX_LENGTH,
} from '@/lib/limits';
import { ACCOUNT_TYPES } from './constants';

export const accountTypeSchema = z.enum(ACCOUNT_TYPES, {
  error: () => 'validation.required',
});

export const accountBalanceSchema = z
  .number({ error: 'validation.required' })
  .int({ error: 'validation.required' })
  .min(-MAX_BALANCE, { error: 'validation.amountTooLarge' })
  .max(MAX_BALANCE, { error: 'validation.amountTooLarge' });

function hasNameOrSystemKey(data: {
  name?: string;
  systemKey?: string;
}): boolean {
  const hasName = typeof data.name === 'string' && data.name.trim().length > 0;
  const hasSystemKey =
    typeof data.systemKey === 'string' && data.systemKey.trim().length > 0;
  return hasName || hasSystemKey;
}

const baseAccountSchema = z.object({
  type: accountTypeSchema,
  initialBalance: accountBalanceSchema,
  balance: accountBalanceSchema.optional(),
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

export const accountInputSchema = baseAccountSchema.refine(hasNameOrSystemKey, {
  error: 'validation.required',
  path: ['name'],
});

const baseAccountDocSchema = z.object({
  id: z
    .string({ error: 'validation.required' })
    .min(1, { error: 'validation.required' }),
  type: accountTypeSchema,
  balance: accountBalanceSchema,
  initialBalance: accountBalanceSchema,
  archived: z.boolean({ error: 'validation.required' }),
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
  createdAt: z.date({ error: 'validation.required' }),
  updatedAt: z.date({ error: 'validation.required' }),
});

export const accountSchema = baseAccountDocSchema.refine(hasNameOrSystemKey, {
  error: 'validation.required',
  path: ['name'],
});

export const accountUpdateInputSchema = z.object({
  name: z
    .string()
    .max(NAME_MAX_LENGTH, { error: 'validation.tooLong' })
    .optional(),
  type: accountTypeSchema.optional(),
  initialBalance: accountBalanceSchema.optional(),
  archived: z.boolean().optional(),
});

export type AccountInput = z.input<typeof accountInputSchema>;
export type AccountUpdateInput = z.infer<typeof accountUpdateInputSchema>;
export type Account = z.infer<typeof accountSchema>;
