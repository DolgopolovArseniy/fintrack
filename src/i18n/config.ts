import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { SUPPORTED_LOCALES, type Locale, DEFAULT_LOCALE } from '@/lib/locales';
import './types';

import commonEn from './locales/en/common.json';
import navEn from './locales/en/nav.json';
import errorsEn from './locales/en/errors.json';
import validationEn from './locales/en/validation.json';
import layoutEn from './locales/en/layout.json';
import placeholderEn from './locales/en/placeholder.json';
import dashboardEn from './locales/en/dashboard.json';
import authEn from './locales/en/auth.json';

import commonRu from './locales/ru/common.json';
import navRu from './locales/ru/nav.json';
import errorsRu from './locales/ru/errors.json';
import validationRu from './locales/ru/validation.json';
import layoutRu from './locales/ru/layout.json';
import placeholderRu from './locales/ru/placeholder.json';
import dashboardRu from './locales/ru/dashboard.json';
import authRu from './locales/ru/auth.json';

export const defaultNS = 'common' as const;
export const namespaces = [
  'common',
  'nav',
  'errors',
  'validation',
  'layout',
  'placeholder',
  'dashboard',
  'auth',
] as const;

export const resources = {
  en: {
    common: commonEn,
    nav: navEn,
    errors: errorsEn,
    validation: validationEn,
    layout: layoutEn,
    placeholder: placeholderEn,
    dashboard: dashboardEn,
    auth: authEn,
  },
  ru: {
    common: commonRu,
    nav: navRu,
    errors: errorsRu,
    validation: validationRu,
    layout: layoutRu,
    placeholder: placeholderRu,
    dashboard: dashboardRu,
    auth: authRu,
  },
} as const;

export const STORAGE_LANG_KEY = 'fintrack-lang';
export type SupportedLanguage = Locale;

export function detectInitialLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }

  try {
    const saved = localStorage.getItem(STORAGE_LANG_KEY);
    if (saved && (SUPPORTED_LOCALES as readonly string[]).includes(saved)) {
      return saved as SupportedLanguage;
    }
  } catch {
    // ignore
  }

  const browserLang = (navigator.language || '').toLowerCase();
  if (browserLang.startsWith('ru')) {
    return 'ru';
  }

  return DEFAULT_LOCALE;
}

export function setStoredLanguage(lang: SupportedLanguage): void {
  try {
    localStorage.setItem(STORAGE_LANG_KEY, lang);
  } catch {
    // ignore
  }
}

export async function changeAppLanguage(
  lang: SupportedLanguage,
): Promise<void> {
  setStoredLanguage(lang);
  await i18n.changeLanguage(lang);
}

void i18n.use(initReactI18next).init({
  resources,
  lng: detectInitialLanguage(),
  fallbackLng: DEFAULT_LOCALE,
  defaultNS,
  fallbackNS: [...namespaces],
  ns: [...namespaces],
  nsSeparator: '.',
  keySeparator: '.',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
