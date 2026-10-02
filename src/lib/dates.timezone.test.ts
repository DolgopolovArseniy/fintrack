import { describe, expect, it } from 'vitest';
import {
  addMonths,
  compareIsoDates,
  formatIsoDate,
  formatYearMonth,
  isValidIsoDate,
  monthRange,
  monthsBack,
  todayIso,
  toIsoDate,
  toYearMonth,
} from './dates';

describe('dates module timezone resilience (AC3)', () => {
  it('reports current environment timezone info', () => {
    const globalObj = globalThis as unknown as {
      process?: { env?: Record<string, string | undefined> };
    };
    const tzEnv = globalObj.process?.env?.TZ ?? 'system-default';
    const intlTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(typeof tzEnv).toBe('string');
    expect(typeof intlTz).toBe('string');
  });

  describe('toIsoDate with local components (AC3 requirement)', () => {
    it('always preserves calendar day from local components without timezone drift', () => {
      // Month 8 in JS Date is September (0-indexed)
      // 23:30 at night: must NOT shift to next day in any timezone
      const lateEvening = new Date(2026, 8, 30, 23, 30);
      expect(toIsoDate(lateEvening)).toBe('2026-09-30');

      // 00:05 in the morning: must NOT shift to previous day
      const earlyMorning = new Date(2026, 8, 30, 0, 5);
      expect(toIsoDate(earlyMorning)).toBe('2026-09-30');

      // New Year Eve boundary
      const newYearEve = new Date(2026, 11, 31, 23, 59);
      expect(toIsoDate(newYearEve)).toBe('2026-12-31');

      // New Year Morning boundary
      const newYearMorning = new Date(2027, 0, 1, 0, 1);
      expect(toIsoDate(newYearMorning)).toBe('2027-01-01');
    });
  });

  describe('todayIso with fixed Date parameter', () => {
    it('returns expected calendar date regardless of local timezone', () => {
      const eveningDate = new Date(2026, 4, 15, 23, 45);
      expect(todayIso(eveningDate)).toBe('2026-05-15');

      const morningDate = new Date(2026, 4, 15, 0, 15);
      expect(todayIso(morningDate)).toBe('2026-05-15');
    });
  });

  describe('formatIsoDate timezone invariance', () => {
    it('formats consistently in en locale without date rolling over', () => {
      expect(formatIsoDate('2026-09-30', 'en', 'short')).toBe('09/30/2026');
      expect(formatIsoDate('2026-09-30', 'en', 'medium')).toBe('Sep 30, 2026');
      expect(formatIsoDate('2026-09-30', 'en', 'long')).toBe(
        'September 30th, 2026',
      );
      expect(formatIsoDate('2026-01-01', 'en', 'short')).toBe('01/01/2026');
    });

    it('formats consistently in ru locale without date rolling over', () => {
      expect(formatIsoDate('2026-09-30', 'ru', 'short')).toBe('30.09.2026');
      expect(formatIsoDate('2026-09-30', 'ru', 'medium')).toBe(
        '30 сент. 2026 г.',
      );
      expect(formatIsoDate('2026-09-30', 'ru', 'long')).toBe(
        '30 сентября 2026 г.',
      );
      expect(formatIsoDate('2026-01-01', 'ru', 'short')).toBe('01.01.2026');
    });
  });

  describe('formatYearMonth timezone invariance', () => {
    it('formats year and month in en and ru without shifting months', () => {
      expect(formatYearMonth('2026-09', 'en')).toBe('September 2026');
      expect(formatYearMonth('2026-09', 'ru')).toBe('сентябрь 2026');
      expect(formatYearMonth('2026-01', 'en')).toBe('January 2026');
      expect(formatYearMonth('2026-01', 'ru')).toBe('январь 2026');
      expect(formatYearMonth('2026-12', 'en')).toBe('December 2026');
      expect(formatYearMonth('2026-12', 'ru')).toBe('декабрь 2026');
    });
  });

  describe('isValidIsoDate leap year and month edge cases in any timezone', () => {
    it('accurately validates dates', () => {
      expect(isValidIsoDate('2024-02-29')).toBe(true); // leap year
      expect(isValidIsoDate('2023-02-29')).toBe(false); // common year
      expect(isValidIsoDate('2026-04-30')).toBe(true);
      expect(isValidIsoDate('2026-04-31')).toBe(false); // April has 30 days
      expect(isValidIsoDate('2026-09-30')).toBe(true);
      expect(isValidIsoDate('2026-09-31')).toBe(false); // Sept has 30 days
    });
  });

  describe('calendar arithmetic and ranges across timezones', () => {
    it('performs month addition and boundary operations reliably', () => {
      expect(addMonths('2026-12', 1)).toBe('2027-01');
      expect(addMonths('2026-01', -1)).toBe('2025-12');
      expect(toYearMonth('2026-09-30')).toBe('2026-09');
      expect(monthRange('2026-02')).toEqual({
        start: '2026-02-01',
        end: '2026-02-31',
      });
      expect(monthsBack('2026-09', 3)).toEqual([
        '2026-07',
        '2026-08',
        '2026-09',
      ]);
      expect(compareIsoDates('2026-01-01', '2026-01-02')).toBe(-1);
    });
  });
});
