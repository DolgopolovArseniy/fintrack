import { z } from 'zod';
import { currencySchema, localeSchema } from '@/lib/schemas';
import { themeSchema, type Theme } from '@/features/auth';
import { DISPLAY_NAME_MAX_LENGTH } from '@/lib/limits';
import type { CurrencyCode } from '@/lib/currencies';
import type { Locale } from '@/lib/locales';

export { themeSchema, type Theme };

export const EXPECTED_CONFIRMATION_PHRASES = ['DELETE', 'УДАЛИТЬ'] as const;

/**
 * Validates whether user-entered confirmation phrase matches the expected phrase,
 * ignoring surrounding whitespace and case sensitivity.
 */
export function isConfirmationPhraseValid(
  input: string,
  expectedPhrase: string = 'DELETE',
): boolean {
  return input.trim().toUpperCase() === expectedPhrase.trim().toUpperCase();
}

/**
 * Schema for updating user profile display name.
 * Trims input and enforces DISPLAY_NAME_MAX_LENGTH limit.
 */
export const updateDisplayNameSchema = z.object({
  displayName: z
    .string()
    .max(DISPLAY_NAME_MAX_LENGTH, { error: 'validation.tooLong' })
    .transform((val) => val.trim()),
});

/**
 * Schema for updating account base currency.
 */
export const updateCurrencySchema = z.object({
  baseCurrency: currencySchema,
});

/**
 * Schema for updating interface language.
 */
export const updateLocaleSchema = z.object({
  locale: localeSchema,
});

/**
 * Schema for updating color theme.
 */
export const updateThemeSchema = z.object({
  theme: themeSchema,
});

/**
 * Schema for updating all or partial profile fields in users/{uid}.
 */
export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .max(DISPLAY_NAME_MAX_LENGTH, { error: 'validation.tooLong' })
    .transform((val) => val.trim())
    .optional(),
  baseCurrency: currencySchema.optional(),
  locale: localeSchema.optional(),
  theme: themeSchema.optional(),
});

/**
 * Schema for account deletion confirmation dialog.
 * Requires confirmation phrase; password is optional (for Google/anonymous users).
 */
export const deleteAccountConfirmationSchema = z.object({
  confirmationPhrase: z.string().min(1, { error: 'validation.required' }),
  password: z.string().optional(),
});

/**
 * Zod schemas for validating FullUserDataDump (GDPR data portability JSON).
 */
export const fullUserDumpProfileSchema = z.object({
  uid: z.string().min(1),
  email: z.string().nullable(),
  displayName: z.string().nullable(),
  baseCurrency: z.string().min(1),
  locale: z.string().min(1),
  theme: z.string().min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const fullUserDumpAccountSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  systemKey: z.string().optional(),
  type: z.string(),
  balance: z.number().int(),
  initialBalance: z.number().int(),
  archived: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const fullUserDumpCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  systemKey: z.string().optional(),
  type: z.string(),
  icon: z.string(),
  color: z.string(),
  archived: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const fullUserDumpBudgetSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  limit: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const fullUserDumpTransactionSchema = z.object({
  id: z.string().min(1),
  type: z.string(),
  amount: z.number().int().positive(),
  accountId: z.string().min(1),
  categoryId: z.string().min(1),
  date: z.string(),
  note: z.string().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const fullUserDataDumpSchema = z.object({
  version: z.number().int().min(1),
  exportedAt: z.iso.datetime(),
  appName: z.string().min(1),
  profile: fullUserDumpProfileSchema,
  accounts: z.array(fullUserDumpAccountSchema),
  categories: z.array(fullUserDumpCategorySchema),
  budgets: z.array(fullUserDumpBudgetSchema),
  transactions: z.array(fullUserDumpTransactionSchema),
});

export type UpdateDisplayNameInput = z.infer<typeof updateDisplayNameSchema>;
export type UpdateCurrencyInput = z.infer<typeof updateCurrencySchema>;
export type UpdateLocaleInput = z.infer<typeof updateLocaleSchema>;
export type UpdateThemeInput = z.infer<typeof updateThemeSchema>;
export type UpdateProfileInput = {
  displayName?: string;
  baseCurrency?: CurrencyCode;
  locale?: Locale;
  theme?: Theme;
};
export type DeleteAccountConfirmationInput = z.infer<
  typeof deleteAccountConfirmationSchema
>;
export type FullUserDataDump = z.infer<typeof fullUserDataDumpSchema>;
