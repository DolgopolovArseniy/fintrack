export const SUPPORTED_LOCALES = ['en', 'ru'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];
