import type { useTranslation } from './i18n';

export const KNOWN_VALIDATION_KEYS = [
  'validation.required',
  'validation.emailInvalid',
  'validation.passwordTooShort',
  'validation.tooLong',
] as const;

export type ValidationKey = (typeof KNOWN_VALIDATION_KEYS)[number];

export function isValidationKey(key: string): key is ValidationKey {
  return (KNOWN_VALIDATION_KEYS as readonly string[]).includes(key);
}

export type AppTFunction = ReturnType<typeof useTranslation>['t'];

/**
 * Translates a validation schema error message using i18next without unsafe type escapes (`any`).
 * Handles plain keys, parameterized strings (key:count), and serialized JSON payloads.
 */
export function translateValidationMessage(
  t: AppTFunction,
  message: unknown,
): string {
  if (typeof message !== 'string' || !message.trim()) {
    return '';
  }

  const trimmed = message.trim();

  // 1. Try parsing serialized JSON options (e.g. { "key": "validation.tooLong", "count": 60 })
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed) as {
        key?: unknown;
        count?: unknown;
      };
      const count = typeof parsed.count === 'number' ? parsed.count : undefined;
      if (parsed.key === 'validation.passwordTooShort') {
        return t('validation.passwordTooShort', { count: count ?? 8 });
      }
      if (parsed.key === 'validation.tooLong') {
        return t('validation.tooLong', { count: count ?? 60 });
      }
      if (parsed.key === 'validation.required') {
        return t('validation.required');
      }
      if (parsed.key === 'validation.emailInvalid') {
        return t('validation.emailInvalid');
      }
    } catch {
      // Ignore JSON parse errors and continue
    }
  }

  // 2. Handle key:count format (e.g. 'validation.tooLong:60' or 'validation.passwordTooShort:8')
  if (trimmed.includes(':')) {
    const [key, rawCount] = trimmed.split(':');
    const count = Number(rawCount);
    if (!Number.isNaN(count)) {
      if (key === 'validation.passwordTooShort') {
        return t('validation.passwordTooShort', { count });
      }
      if (key === 'validation.tooLong') {
        return t('validation.tooLong', { count });
      }
    }
  }

  // 3. Handle known validation keys with sensible defaults for parameterized keys
  if (isValidationKey(trimmed)) {
    if (trimmed === 'validation.passwordTooShort') {
      return t('validation.passwordTooShort', { count: 8 });
    }
    if (trimmed === 'validation.tooLong') {
      return t('validation.tooLong', { count: 60 });
    }
    if (trimmed === 'validation.required') {
      return t('validation.required');
    }
    if (trimmed === 'validation.emailInvalid') {
      return t('validation.emailInvalid');
    }
  }

  // 4. Fallback: if already localized or unknown string, return as is
  return trimmed;
}
