/**
 * Supported locales and locale utilities.
 * Supported locales whitelist must match firestore.rules and i18n configuration.
 */

export const SUPPORTED_LOCALES = ['en', 'ru'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

const SUPPORTED_LOCALE_SET = new Set<string>(SUPPORTED_LOCALES);

export function isSupportedLocale(value: string): value is Locale {
  return SUPPORTED_LOCALE_SET.has(value);
}
