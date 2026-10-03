import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  SUPPORTED_LOCALES,
} from './locales';

describe('locales', () => {
  it('exports the supported locales whitelist and default locale', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'ru']);
    expect(DEFAULT_LOCALE).toBe('en');
  });

  it('validates supported locales and rejects invalid ones', () => {
    expect(isSupportedLocale('en')).toBe(true);
    expect(isSupportedLocale('ru')).toBe(true);

    expect(isSupportedLocale('es')).toBe(false);
    expect(isSupportedLocale('de')).toBe(false);
    expect(isSupportedLocale('EN')).toBe(false);
    expect(isSupportedLocale('')).toBe(false);
  });
});
