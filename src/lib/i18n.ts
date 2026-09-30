import * as React from 'react';

export const translations = {
  en: {
    'layout.theme.light': 'Light',
    'layout.theme.dark': 'Dark',
    'layout.theme.system': 'System',
    'layout.theme.toggle': 'Toggle theme',
    'nav.dashboard': 'Dashboard',
    'nav.transactions': 'Transactions',
    'nav.accounts': 'Accounts',
    'nav.budgets': 'Budgets',
    'nav.categories': 'Categories',
    'nav.settings': 'Settings',
    'nav.more': 'More',
    'common.actions.primary': 'Primary Action',
    'common.actions.secondary': 'Secondary Action',
    'common.actions.outline': 'Outline Action',
    'common.actions.destructive': 'Destructive Action',
    'dashboard.welcome': 'Welcome to FinTrack',
    'dashboard.description': 'Manage your personal finances efficiently',
  },
  ru: {
    'layout.theme.light': 'Светлая',
    'layout.theme.dark': 'Тёмная',
    'layout.theme.system': 'Системная',
    'layout.theme.toggle': 'Переключить тему',
    'nav.dashboard': 'Дашборд',
    'nav.transactions': 'Транзакции',
    'nav.accounts': 'Счета',
    'nav.budgets': 'Бюджеты',
    'nav.categories': 'Категории',
    'nav.settings': 'Настройки',
    'nav.more': 'Ещё',
    'common.actions.primary': 'Основное действие',
    'common.actions.secondary': 'Вторичное действие',
    'common.actions.outline': 'Контурная кнопка',
    'common.actions.destructive': 'Опасное действие',
    'dashboard.welcome': 'Добро пожаловать в FinTrack',
    'dashboard.description': 'Эффективное управление личными финансами',
  },
} as const;

export type TranslationKey = keyof (typeof translations)['en'];
export type Locale = 'en' | 'ru';

export function getTranslation(
  key: TranslationKey,
  locale: Locale = 'en',
): string {
  const dict = translations[locale] ?? translations.en;
  return dict[key] ?? translations.en[key] ?? key;
}

export function useTranslation() {
  const t = React.useCallback(
    (key: TranslationKey) => getTranslation(key, 'en'),
    [],
  );

  return { t };
}
