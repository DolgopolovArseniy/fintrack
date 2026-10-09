import { z } from 'zod';
import { currencySchema } from '@/lib/schemas';
import { DISPLAY_NAME_MAX_LENGTH } from '@/lib/limits';

export const PASSWORD_MIN_LENGTH = 8;

export const loginSchema = z.object({
  email: z
    .string({ error: 'validation.required' })
    .trim()
    .min(1, { error: 'validation.required' })
    .email({ error: 'validation.emailInvalid' }),
  password: z
    .string({ error: 'validation.required' })
    .min(1, { error: 'validation.required' }),
});

export const registerSchema = z.object({
  displayName: z
    .string()
    .trim()
    .max(DISPLAY_NAME_MAX_LENGTH, { error: 'validation.tooLong' })
    .optional(),
  email: z
    .string({ error: 'validation.required' })
    .trim()
    .min(1, { error: 'validation.required' })
    .email({ error: 'validation.emailInvalid' }),
  password: z
    .string({ error: 'validation.required' })
    .min(1, { error: 'validation.required' })
    .min(PASSWORD_MIN_LENGTH, { error: 'validation.passwordTooShort' }),
});

export const resetPasswordSchema = z.object({
  email: z
    .string({ error: 'validation.required' })
    .trim()
    .min(1, { error: 'validation.required' })
    .email({ error: 'validation.emailInvalid' }),
});

export const onboardingSchema = z.object({
  baseCurrency: currencySchema,
  displayName: z
    .string()
    .trim()
    .max(DISPLAY_NAME_MAX_LENGTH, { error: 'validation.tooLong' })
    .optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type OnboardingFormInput = z.infer<typeof onboardingSchema>;
