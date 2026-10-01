import { z } from 'zod';
import { currencySchema } from '@/lib/schemas';
import { DISPLAY_NAME_MAX_LENGTH } from '@/lib/limits';

export const localeSchema = z.enum(['en', 'ru'], {
  error: () => 'validation.required',
});
export type Locale = z.infer<typeof localeSchema>;

export const themeSchema = z.enum(['light', 'dark', 'system'], {
  error: () => 'validation.required',
});
export type Theme = z.infer<typeof themeSchema>;

export const schemaVersionSchema = z
  .number({ error: 'validation.required' })
  .int({ error: 'validation.required' })
  .min(1, { error: 'validation.required' })
  .max(1000, { error: 'validation.required' });

export const userProfileInputSchema = z.object({
  baseCurrency: currencySchema,
  locale: localeSchema,
  theme: themeSchema,
  schemaVersion: schemaVersionSchema.default(1),
  displayName: z
    .string()
    .max(DISPLAY_NAME_MAX_LENGTH, { error: 'validation.tooLong' })
    .optional(),
});

export const userProfileSchema = z.object({
  id: z
    .string({ error: 'validation.required' })
    .min(1, { error: 'validation.required' }),
  baseCurrency: currencySchema,
  locale: localeSchema,
  theme: themeSchema,
  schemaVersion: schemaVersionSchema,
  displayName: z
    .string()
    .max(DISPLAY_NAME_MAX_LENGTH, { error: 'validation.tooLong' })
    .optional(),
  createdAt: z.date({ error: 'validation.required' }),
  updatedAt: z.date({ error: 'validation.required' }),
});

export type UserProfileInput = z.infer<typeof userProfileInputSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
