import { CurrencyCode } from './currencies';
import { MAX_AMOUNT } from './limits';

export type Locale = 'en' | 'ru';
export type TransactionType = 'expense' | 'income';

const FORMATTER_CACHE = new Map<string, Intl.NumberFormat>();

function getFormatter(
  locale: Locale,
  currency: CurrencyCode,
): Intl.NumberFormat {
  const cacheKey = `${locale}:${currency}`;
  let formatter = FORMATTER_CACHE.get(cacheKey);
  if (!formatter) {
    const intlLocale = locale === 'ru' ? 'ru-RU' : 'en-US';
    formatter = new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    FORMATTER_CACHE.set(cacheKey, formatter);
  }
  return formatter;
}

function isValidThousandsGrouping(groups: string[]): boolean {
  // First group must be 1 to 3 digits
  if (!/^\d{1,3}$/.test(groups[0]!)) {
    return false;
  }
  // Every subsequent group must be exactly 3 digits
  for (let i = 1; i < groups.length; i++) {
    if (!/^\d{3}$/.test(groups[i]!)) {
      return false;
    }
  }
  return true;
}

/**
 * Parses user money input string into integer minor units (cents/kopecks).
 * Deterministic and locale-agnostic rules:
 * - Trims edges, strips internal spaces (including NBSP, NNBSP, thin spaces) and apostrophes.
 * - Allowed characters: [0-9], '.', ','.
 * - If both '.' and ',' are present: the last is decimal, the other is thousands grouping.
 * - If one separator is present:
 *   - Multiple occurrences -> thousands grouping (groups of 3 digits).
 *   - Single occurrence followed by 1-2 digits -> decimal separator.
 *   - Single occurrence followed by 3 digits -> thousands grouping (if leading group has 1-3 digits).
 *   - Single occurrence followed by >= 4 digits -> null.
 * - Returns null for invalid strings, signs (+/-), exponents, or minor units > MAX_AMOUNT.
 */
export function parseMoneyInput(input: string): number | null {
  if (typeof input !== 'string') {
    return null;
  }

  // 1. Trim edges and remove spaces (normal, NBSP, NNBSP, thin, etc.) and Swiss apostrophes (' or ’)
  const cleaned = input.trim().replace(/[\s\u00A0\u202F\u2009\u200B'’]+/g, '');

  if (cleaned.length === 0) {
    return null;
  }

  // 2. Only digits 0-9 and separators . and , are allowed; must contain at least one digit
  if (!/^[0-9.,]+$/.test(cleaned) || !/\d/.test(cleaned)) {
    return null;
  }

  let intPart: string;
  let fracPart: string;

  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');

  if (lastDot !== -1 && lastComma !== -1) {
    // Both separators present: last one is decimal separator
    if (lastDot > lastComma) {
      // '.' is decimal separator, ',' is thousands grouping
      // Only one decimal separator allowed
      if (cleaned.indexOf('.') !== lastDot) {
        return null;
      }
      fracPart = cleaned.slice(lastDot + 1);
      if (fracPart.length > 2) {
        return null;
      }

      const rawInt = cleaned.slice(0, lastDot);
      const groups = rawInt.split(',');
      if (!isValidThousandsGrouping(groups)) {
        return null;
      }
      intPart = groups.join('');
    } else {
      // ',' is decimal separator, '.' is thousands grouping
      // Only one decimal separator allowed
      if (cleaned.indexOf(',') !== lastComma) {
        return null;
      }
      fracPart = cleaned.slice(lastComma + 1);
      if (fracPart.length > 2) {
        return null;
      }

      const rawInt = cleaned.slice(0, lastComma);
      const groups = rawInt.split('.');
      if (!isValidThousandsGrouping(groups)) {
        return null;
      }
      intPart = groups.join('');
    }
  } else if (lastDot !== -1 || lastComma !== -1) {
    // Only one separator type is present
    const sep = lastDot !== -1 ? '.' : ',';
    const parts = cleaned.split(sep);

    if (parts.length > 2) {
      // Multiple occurrences: must be thousands grouping
      if (!isValidThousandsGrouping(parts)) {
        return null;
      }
      intPart = parts.join('');
      fracPart = '';
    } else {
      // Exactly one occurrence
      const before = parts[0]!;
      const after = parts[1]!;

      if (after.length === 0) {
        // Trailing separator like "12." -> 1200
        intPart = before;
        fracPart = '';
      } else if (before.length === 0) {
        // Leading separator like ".5" -> 50
        if (after.length > 2) {
          return null;
        }
        intPart = '0';
        fracPart = after;
      } else if (after.length <= 2) {
        // Single separator followed by 1 or 2 digits -> decimal separator
        intPart = before;
        fracPart = after;
      } else if (after.length === 3) {
        // Single separator followed by exactly 3 digits -> thousands grouping
        // First group must have 1-3 digits
        if (!/^\d{1,3}$/.test(before)) {
          return null;
        }
        intPart = before + after;
        fracPart = '';
      } else {
        // Followed by >= 4 digits
        return null;
      }
    }
  } else {
    // No separators present
    intPart = cleaned;
    fracPart = '';
  }

  // Normalize integer and fractional parts
  const normalizedInt = intPart.replace(/^0+/, '') || '0';
  if (normalizedInt.length > 11) {
    // Exceeds MAX_AMOUNT (100_000_000_000 has 12 digits in minor units: 10 integer digits + 2 zeros)
    return null;
  }

  let normalizedFrac = '00';
  if (fracPart.length === 1) {
    normalizedFrac = `${fracPart}0`;
  } else if (fracPart.length === 2) {
    normalizedFrac = fracPart;
  }

  const minor = Number(normalizedInt + normalizedFrac);
  if (!Number.isSafeInteger(minor) || minor < 0 || minor > MAX_AMOUNT) {
    return null;
  }

  return minor;
}

/**
 * Formats integer minor units into a localized currency string.
 * Example:
 * - 1050, { locale: 'en', currency: 'USD' } -> "$10.50"
 * - 1050, { locale: 'ru', currency: 'UAH' } -> "10,50 ₴"
 */
export function formatMoney(
  minor: number,
  options: { locale: Locale; currency: CurrencyCode },
): string {
  // Normalize 0 and -0
  const normalizedMinor = minor === 0 ? 0 : minor;
  const formatter = getFormatter(options.locale, options.currency);
  return formatter.format(normalizedMinor / 100);
}

/**
 * Formats integer minor units into an editable form input string without thousands separators.
 * Uses locale-specific decimal separator ('.' for 'en', ',' for 'ru').
 * Example:
 * - 1250, 'en' -> '12.50'
 * - 1250, 'ru' -> '12,50'
 * - 0, 'en' -> '0.00'
 */
export function formatMoneyInput(minor: number, locale: Locale): string {
  const isNegative = minor < 0;
  const abs = Math.abs(Math.trunc(minor));
  const majorPart = Math.floor(abs / 100).toString();
  const minorPart = (abs % 100).toString().padStart(2, '0');
  const separator = locale === 'ru' ? ',' : '.';
  return `${isNegative ? '-' : ''}${majorPart}${separator}${minorPart}`;
}

/**
 * Applies transaction sign: income is positive, expense is negative.
 * 0 always remains 0 (never -0).
 */
export function signedAmount(type: TransactionType, amount: number): number {
  const absAmount = Math.abs(amount);
  if (absAmount === 0) {
    return 0;
  }
  return type === 'income' ? absAmount : -absAmount;
}

/**
 * Converts major units to minor units (rounding to nearest integer).
 */
export function toMinorUnits(major: number): number {
  return Math.round(major * 100);
}

/**
 * Converts minor units to major units (for charts, calculations).
 */
export function fromMinorUnits(minor: number): number {
  return minor / 100;
}
