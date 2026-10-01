import { describe, it, expect } from 'vitest';
import {
  isValidIsoDate,
  isValidYearMonth,
  toIsoDate,
  todayIso,
  toYearMonth,
  currentYearMonth,
  addMonths,
  monthRange,
  monthsBack,
  compareIsoDates,
  formatIsoDate,
  formatYearMonth,
} from './dates';

describe('dates module', () => {
  describe('isValidIsoDate', () => {
    it('accepts valid dates including leap day in leap years', () => {
      expect(isValidIsoDate('2024-02-29')).toBe(true);
      expect(isValidIsoDate('2000-02-29')).toBe(true);
      expect(isValidIsoDate('2026-01-01')).toBe(true);
      expect(isValidIsoDate('2026-01-31')).toBe(true);
      expect(isValidIsoDate('2026-04-30')).toBe(true);
      expect(isValidIsoDate('2026-12-31')).toBe(true);
    });

    it('rejects invalid leap days in common years', () => {
      expect(isValidIsoDate('2023-02-29')).toBe(false);
      expect(isValidIsoDate('1900-02-29')).toBe(false);
      expect(isValidIsoDate('2100-02-29')).toBe(false);
    });

    it('rejects day 31 for 30-day months', () => {
      expect(isValidIsoDate('2026-04-31')).toBe(false);
      expect(isValidIsoDate('2026-06-31')).toBe(false);
      expect(isValidIsoDate('2026-09-31')).toBe(false);
      expect(isValidIsoDate('2026-11-31')).toBe(false);
    });

    it('rejects out of bounds months and days', () => {
      expect(isValidIsoDate('2026-00-10')).toBe(false);
      expect(isValidIsoDate('2026-13-01')).toBe(false);
      expect(isValidIsoDate('2026-01-00')).toBe(false);
      expect(isValidIsoDate('2026-01-32')).toBe(false);
    });

    it('rejects malformed and non-string inputs', () => {
      expect(isValidIsoDate('2026-9-1')).toBe(false);
      expect(isValidIsoDate('2026-09-1')).toBe(false);
      expect(isValidIsoDate('2026-9-01')).toBe(false);
      expect(isValidIsoDate('2026/09/01')).toBe(false);
      expect(isValidIsoDate('')).toBe(false);
      expect(isValidIsoDate('invalid-date')).toBe(false);
      // @ts-expect-error non-string runtime test
      expect(isValidIsoDate(null)).toBe(false);
      // @ts-expect-error non-string runtime test
      expect(isValidIsoDate(undefined)).toBe(false);
      // @ts-expect-error non-string runtime test
      expect(isValidIsoDate(20260901)).toBe(false);
    });
  });

  describe('isValidYearMonth', () => {
    it('validates correct YYYY-MM strings', () => {
      expect(isValidYearMonth('2026-01')).toBe(true);
      expect(isValidYearMonth('2026-12')).toBe(true);
      expect(isValidYearMonth('1999-07')).toBe(true);
    });

    it('rejects invalid YYYY-MM strings and bad formats', () => {
      expect(isValidYearMonth('2026-00')).toBe(false);
      expect(isValidYearMonth('2026-13')).toBe(false);
      expect(isValidYearMonth('2026-1')).toBe(false);
      expect(isValidYearMonth('2026/01')).toBe(false);
      expect(isValidYearMonth('2026-01-01')).toBe(false);
      expect(isValidYearMonth('')).toBe(false);
      // @ts-expect-error non-string runtime test
      expect(isValidYearMonth(null)).toBe(false);
      // @ts-expect-error non-string runtime test
      expect(isValidYearMonth(undefined)).toBe(false);
    });
  });

  describe('toIsoDate', () => {
    it('formats date based on LOCAL components (AC3)', () => {
      // Month 8 in JS Date is September (0-indexed)
      const date = new Date(2026, 8, 30, 23, 30);
      expect(toIsoDate(date)).toBe('2026-09-30');

      const morning = new Date(2026, 0, 5, 1, 15);
      expect(toIsoDate(morning)).toBe('2026-01-05');
    });
  });

  describe('todayIso', () => {
    it('returns ISO date for provided date', () => {
      const fixed = new Date(2026, 4, 15);
      expect(todayIso(fixed)).toBe('2026-05-15');
    });

    it('returns valid ISO date for current moment when no arg provided', () => {
      const today = todayIso();
      expect(isValidIsoDate(today)).toBe(true);
    });
  });

  describe('toYearMonth', () => {
    it('slices YYYY-MM from YYYY-MM-DD', () => {
      expect(toYearMonth('2026-09-30')).toBe('2026-09');
      expect(toYearMonth('2025-01-15')).toBe('2025-01');
    });
  });

  describe('currentYearMonth', () => {
    it('returns YearMonth for provided date', () => {
      const fixed = new Date(2026, 8, 30);
      expect(currentYearMonth(fixed)).toBe('2026-09');
    });

    it('returns valid YearMonth for current moment when no arg provided', () => {
      const current = currentYearMonth();
      expect(isValidYearMonth(current)).toBe(true);
    });
  });

  describe('addMonths', () => {
    it('handles increment across year boundaries (AC4)', () => {
      expect(addMonths('2026-12', 1)).toBe('2027-01');
    });

    it('handles decrement across year boundaries (AC4)', () => {
      expect(addMonths('2026-01', -1)).toBe('2025-12');
    });

    it('handles zero delta', () => {
      expect(addMonths('2026-06', 0)).toBe('2026-06');
    });

    it('handles multi-year positive and negative deltas', () => {
      expect(addMonths('2026-05', 24)).toBe('2028-05');
      expect(addMonths('2026-05', -25)).toBe('2024-04');
    });
  });

  describe('monthRange', () => {
    it('returns start as 01 and end as 31 for string indexing', () => {
      expect(monthRange('2026-02')).toEqual({
        start: '2026-02-01',
        end: '2026-02-31',
      });
      expect(monthRange('2026-09')).toEqual({
        start: '2026-09-01',
        end: '2026-09-31',
      });
    });
  });

  describe('monthsBack', () => {
    it('returns months in ascending chronological order ending with endMonth', () => {
      expect(monthsBack('2026-09', 3)).toEqual([
        '2026-07',
        '2026-08',
        '2026-09',
      ]);
      expect(monthsBack('2026-01', 2)).toEqual(['2025-12', '2026-01']);
      expect(monthsBack('2026-09', 1)).toEqual(['2026-09']);
    });

    it('returns empty array when count is zero or negative', () => {
      expect(monthsBack('2026-09', 0)).toEqual([]);
      expect(monthsBack('2026-09', -3)).toEqual([]);
    });
  });

  describe('compareIsoDates', () => {
    it('compares dates chronologically', () => {
      expect(compareIsoDates('2026-01-01', '2026-01-02')).toBe(-1);
      expect(compareIsoDates('2026-01-02', '2026-01-01')).toBe(1);
      expect(compareIsoDates('2026-05-15', '2026-05-15')).toBe(0);
    });
  });

  describe('formatIsoDate', () => {
    it('formats in en locale with short, medium, long styles', () => {
      expect(formatIsoDate('2026-09-30', 'en', 'short')).toBe('09/30/2026');
      expect(formatIsoDate('2026-09-30', 'en', 'medium')).toBe('Sep 30, 2026');
      expect(formatIsoDate('2026-09-30', 'en', 'long')).toBe(
        'September 30th, 2026',
      );
    });

    it('formats in ru locale with short, medium, long styles', () => {
      expect(formatIsoDate('2026-09-30', 'ru', 'short')).toBe('30.09.2026');
      expect(formatIsoDate('2026-09-30', 'ru', 'medium')).toBe(
        '30 сент. 2026 г.',
      );
      expect(formatIsoDate('2026-09-30', 'ru', 'long')).toBe(
        '30 сентября 2026 г.',
      );
    });
  });

  describe('formatYearMonth', () => {
    it('formats YearMonth in en and ru locales using nominative standalone month', () => {
      expect(formatYearMonth('2026-09', 'en')).toBe('September 2026');
      expect(formatYearMonth('2026-09', 'ru')).toBe('сентябрь 2026');
      expect(formatYearMonth('2026-01', 'en')).toBe('January 2026');
      expect(formatYearMonth('2026-01', 'ru')).toBe('январь 2026');
    });
  });
});
