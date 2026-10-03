import { useTranslation as useI18nTranslation } from 'react-i18next';
import i18n, {
  changeAppLanguage,
  detectInitialLanguage,
  type namespaces,
} from '@/i18n/config';
import { type Locale, SUPPORTED_LOCALES, DEFAULT_LOCALE } from './locales';

export type { Locale };
export { SUPPORTED_LOCALES, DEFAULT_LOCALE };
export type AppNamespace = (typeof namespaces)[number];

export function useTranslation(ns?: AppNamespace | AppNamespace[]) {
  return useI18nTranslation(ns);
}

export { i18n, changeAppLanguage, detectInitialLanguage };
export { translateValidationMessage } from './validation';
