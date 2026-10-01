import { describe, expect, it } from 'vitest';
import {
  CurrencyCode,
  DEFAULT_CURRENCY,
  getFractionDigits,
  isSupportedCurrency,
  SUPPORTED_CURRENCIES,
} from './currencies';

describe('currencies', () => {
  it('exports the exact 9 supported currencies whitelist and default currency', () => {
    expect(SUPPORTED_CURRENCIES).toEqual([
      'USD',
      'EUR',
      'GBP',
      'UAH',
      'PLN',
      'CZK',
      'CHF',
      'CAD',
      'AUD',
    ]);
    expect(DEFAULT_CURRENCY).toBe('USD');
  });

  it('validates supported currencies with case-sensitivity and rejects invalid inputs', () => {
    for (const currency of SUPPORTED_CURRENCIES) {
      expect(isSupportedCurrency(currency)).toBe(true);
    }

    // Lowercase / mixed case
    expect(isSupportedCurrency('usd')).toBe(false);
    expect(isSupportedCurrency('Eur')).toBe(false);

    // Whitespace
    expect(isSupportedCurrency(' USD ')).toBe(false);
    expect(isSupportedCurrency('USD\n')).toBe(false);

    // Unsupported or fictional codes
    expect(isSupportedCurrency('JPY')).toBe(false);
    expect(isSupportedCurrency('BTC')).toBe(false);
    expect(isSupportedCurrency('XYZ')).toBe(false);
    expect(isSupportedCurrency('')).toBe(false);
  });

  it('returns 2 fraction digits for all supported currencies via Intl resolution', () => {
    for (const currency of SUPPORTED_CURRENCIES) {
      expect(getFractionDigits(currency)).toBe(2);
    }
  });

  it('resolves fallback fraction digits if an unlisted currency is passed at runtime', () => {
    // Valid ISO currency outside whitelist
    const jpyDigits = getFractionDigits('JPY' as CurrencyCode);
    expect(jpyDigits).toBe(0);

    // Completely invalid currency code
    const fallbackDigits = getFractionDigits('UNKNOWN' as CurrencyCode);
    expect(fallbackDigits).toBe(2);
  });
});
