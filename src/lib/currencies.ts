/**
 * Supported currencies and currency utilities.
 * Supported currencies whitelist must match firestore.rules.
 */

export const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'UAH',
  'PLN',
  'CZK',
  'CHF',
  'CAD',
  'AUD',
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: CurrencyCode = 'USD';

const SUPPORTED_CURRENCY_SET = new Set<string>(SUPPORTED_CURRENCIES);

export function isSupportedCurrency(value: string): value is CurrencyCode {
  return SUPPORTED_CURRENCY_SET.has(value);
}

// Pre-resolve fraction digits via Intl.NumberFormat to avoid runtime re-instantiation overhead
const FRACTION_DIGITS_MAP: Readonly<Record<CurrencyCode, number>> =
  Object.freeze(
    SUPPORTED_CURRENCIES.reduce(
      (acc, curr) => {
        const options = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: curr,
        }).resolvedOptions();
        acc[curr] = options.minimumFractionDigits ?? 2;
        return acc;
      },
      {} as Record<CurrencyCode, number>,
    ),
  );

/**
 * Returns the number of minor units (fraction digits) for a supported currency.
 * Evaluated via Intl.NumberFormat resolvedOptions (all currently supported currencies = 2).
 */
export function getFractionDigits(currency: CurrencyCode): number {
  const digits = FRACTION_DIGITS_MAP[currency];
  if (digits !== undefined) {
    return digits;
  }
  try {
    const options = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).resolvedOptions();
    return options.minimumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}
