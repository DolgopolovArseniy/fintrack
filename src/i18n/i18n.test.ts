import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import i18n, {
  detectInitialLanguage,
  STORAGE_LANG_KEY,
  changeAppLanguage,
  resources,
} from './config';

describe('i18n configuration and detection', () => {
  const originalLanguage = navigator.language;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'language', {
      value: originalLanguage,
      configurable: true,
    });
  });

  it('detects Russian language when navigator.language starts with ru', () => {
    Object.defineProperty(navigator, 'language', {
      value: 'ru-RU',
      configurable: true,
    });
    expect(detectInitialLanguage()).toBe('ru');
  });

  it('detects English language as fallback for other locales', () => {
    Object.defineProperty(navigator, 'language', {
      value: 'de-DE',
      configurable: true,
    });
    expect(detectInitialLanguage()).toBe('en');
  });

  it('prefers stored language in localStorage over browser locale', () => {
    localStorage.setItem(STORAGE_LANG_KEY, 'en');
    Object.defineProperty(navigator, 'language', {
      value: 'ru-RU',
      configurable: true,
    });
    expect(detectInitialLanguage()).toBe('en');
  });

  it('persists selected language in localStorage on change', async () => {
    await changeAppLanguage('ru');
    expect(localStorage.getItem(STORAGE_LANG_KEY)).toBe('ru');
    expect(i18n.language).toBe('ru');
  });
});

describe('i18n pluralization rules', () => {
  it('correctly formats Russian 3-form plurals (one, few, many)', async () => {
    await i18n.changeLanguage('ru');

    expect(i18n.t('days', { count: 1 })).toBe('1 день');
    expect(i18n.t('days', { count: 2 })).toBe('2 дня');
    expect(i18n.t('days', { count: 4 })).toBe('4 дня');
    expect(i18n.t('days', { count: 5 })).toBe('5 дней');
    expect(i18n.t('days', { count: 11 })).toBe('11 дней');
    expect(i18n.t('days', { count: 21 })).toBe('21 день');
    expect(i18n.t('days', { count: 22 })).toBe('22 дня');
    expect(i18n.t('days', { count: 25 })).toBe('25 дней');
  });

  it('correctly formats English plurals (one, other)', async () => {
    await i18n.changeLanguage('en');

    expect(i18n.t('days', { count: 1 })).toBe('1 day');
    expect(i18n.t('days', { count: 2 })).toBe('2 days');
    expect(i18n.t('days', { count: 5 })).toBe('5 days');
  });
});

describe('auth and validation i18n resources', () => {
  it('translates auth and validation keys in both english and russian', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('auth.login.title')).toBe('Welcome back');
    expect(i18n.t('auth.errors.invalidCredential')).toBe(
      'Invalid email or password',
    );
    expect(i18n.t('validation.required')).toBe('This field is required');
    expect(i18n.t('validation.passwordTooShort', { count: 8 })).toBe(
      'Password must be at least 8 characters long',
    );
    expect(i18n.t('auth.verify.resendCooldown', { count: 60 })).toBe(
      'Resend email in 60s',
    );

    await i18n.changeLanguage('ru');
    expect(i18n.t('auth.login.title')).toBe('Вход в FinTrack');
    expect(i18n.t('auth.errors.invalidCredential')).toBe(
      'Неверный email или пароль',
    );
    expect(i18n.t('validation.required')).toBe('Обязательное поле');
    expect(i18n.t('validation.passwordTooShort', { count: 8 })).toBe(
      'Пароль должен содержать минимум 8 символов',
    );
    expect(i18n.t('auth.verify.resendCooldown', { count: 60 })).toBe(
      'Отправить повторно через 60 с',
    );
  });

  it('maintains parity of all keys between EN and RU for auth and validation', () => {
    function getLeafPaths(obj: Record<string, unknown>, prefix = ''): string[] {
      return Object.entries(obj).flatMap(([key, val]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          return getLeafPaths(val as Record<string, unknown>, fullKey);
        }
        return [fullKey];
      });
    }

    const enAuthKeys = getLeafPaths(resources.en.auth).sort();
    const ruAuthKeys = getLeafPaths(resources.ru.auth).sort();
    expect(enAuthKeys).toEqual(ruAuthKeys);

    const enValidationKeys = getLeafPaths(resources.en.validation)
      .map((k) => k.replace(/_(one|other|few|many)$/, ''))
      .sort();
    const ruValidationKeys = getLeafPaths(resources.ru.validation)
      .map((k) => k.replace(/_(one|other|few|many)$/, ''))
      .sort();
    expect(Array.from(new Set(enValidationKeys))).toEqual(
      Array.from(new Set(ruValidationKeys)),
    );
  });
});
