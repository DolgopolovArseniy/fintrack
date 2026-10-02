import {
  format,
  addMonths as dateFnsAddMonths,
  getDaysInMonth,
} from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import { type Locale } from './locales';

export type IsoDate = string; // 'YYYY-MM-DD'
export type YearMonth = string; // 'YYYY-MM'

const ISO_DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const YEAR_MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

const DATE_FNS_LOCALES: Record<Locale, typeof enUS> = {
  en: enUS,
  ru,
};

const STYLE_FORMAT_PATTERNS: Record<'short' | 'medium' | 'long', string> = {
  short: 'P',
  medium: 'PP',
  long: 'PPP',
};

/**
 * Checks whether an input string is a valid ISO date string ('YYYY-MM-DD'),
 * validating syntax, month range, days per month, and leap years.
 */
export function isValidIsoDate(value: string): boolean {
  if (typeof value !== 'string' || !ISO_DATE_REGEX.test(value)) {
    return false;
  }
  const [yStr, mStr, dStr] = value.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);

  // Month in JS Date is 0-indexed. Noon anchor prevents DST edge cases.
  const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1, 12, 0, 0));
  return day >= 1 && day <= daysInMonth;
}

/**
 * Checks whether an input string is a valid ISO Year-Month string ('YYYY-MM').
 */
export function isValidYearMonth(value: string): boolean {
  return typeof value === 'string' && YEAR_MONTH_REGEX.test(value);
}

/**
 * Converts a JavaScript Date object into an IsoDate ('YYYY-MM-DD')
 * using the date's LOCAL calendar components.
 * Example: new Date(2026, 8, 30, 23, 30) -> '2026-09-30'
 */
export function toIsoDate(date: Date): IsoDate {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Returns today's calendar date as IsoDate ('YYYY-MM-DD').
 */
export function todayIso(now: Date = new Date()): IsoDate {
  return toIsoDate(now);
}

/**
 * Extracts 'YYYY-MM' from an IsoDate ('YYYY-MM-DD').
 */
export function toYearMonth(date: IsoDate): YearMonth {
  return date.slice(0, 7);
}

/**
 * Returns current month as YearMonth ('YYYY-MM').
 */
export function currentYearMonth(now: Date = new Date()): YearMonth {
  return toYearMonth(todayIso(now));
}

/**
 * Adds or subtracts months to a YearMonth ('YYYY-MM').
 * Example:
 * - addMonths('2026-12', 1) -> '2027-01'
 * - addMonths('2026-01', -1) -> '2025-12'
 */
export function addMonths(month: YearMonth, delta: number): YearMonth {
  const [yStr, mStr] = month.split('-');
  const year = Number(yStr);
  const monthNum = Number(mStr);
  const date = new Date(year, monthNum - 1, 1, 12, 0, 0);
  const result = dateFnsAddMonths(date, delta);
  return format(result, 'yyyy-MM');
}

/**
 * Returns the query range for a given month.
 * The upper boundary end is `${month}-31` for lexicographical Firestore string queries.
 */
export function monthRange(month: YearMonth): { start: IsoDate; end: IsoDate } {
  return {
    start: `${month}-01`,
    end: `${month}-31`,
  };
}

/**
 * Returns an array of YearMonth strings going back count months,
 * in ascending chronological order, ending with endMonth.
 * Example: monthsBack('2026-09', 3) -> ['2026-07', '2026-08', '2026-09']
 */
export function monthsBack(endMonth: YearMonth, count: number): YearMonth[] {
  if (count <= 0) {
    return [];
  }
  const result: YearMonth[] = [];
  for (let i = count - 1; i >= 0; i--) {
    result.push(addMonths(endMonth, -i));
  }
  return result;
}

/**
 * Compares two IsoDate strings chronologically.
 * Returns negative if a < b, 0 if a === b, positive if a > b.
 */
export function compareIsoDates(a: IsoDate, b: IsoDate): number {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

/**
 * Formats an IsoDate string using date-fns and the specified locale and style.
 * Uses a noon anchor (12:00:00) so formatting never rolls over across timezones.
 */
export function formatIsoDate(
  date: IsoDate,
  locale: Locale,
  style: 'short' | 'medium' | 'long',
): string {
  const [yStr, mStr, dStr] = date.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);
  const noonDate = new Date(year, month - 1, day, 12, 0, 0);

  return format(noonDate, STYLE_FORMAT_PATTERNS[style], {
    locale: DATE_FNS_LOCALES[locale],
  });
}

/**
 * Formats a YearMonth string into a localized month name and year.
 * Standalone month nominative case ('LLLL yyyy') is used:
 * - '2026-09', 'en' -> 'September 2026'
 * - '2026-09', 'ru' -> 'сентябрь 2026'
 */
export function formatYearMonth(month: YearMonth, locale: Locale): string {
  const [yStr, mStr] = month.split('-');
  const year = Number(yStr);
  const monthNum = Number(mStr);
  const noonDate = new Date(year, monthNum - 1, 1, 12, 0, 0);

  return format(noonDate, 'LLLL yyyy', {
    locale: DATE_FNS_LOCALES[locale],
  });
}
