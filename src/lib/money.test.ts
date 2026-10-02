import { describe, expect, it } from 'vitest';
import { SUPPORTED_CURRENCIES } from './currencies';
import { MAX_AMOUNT, MAX_BALANCE } from './limits';
import {
  formatMoney,
  formatMoneyInput,
  fromMinorUnits,
  parseMoneyInput,
  signedAmount,
} from './money';

describe('money', () => {
  describe('parseMoneyInput (AC1)', () => {
    it('correctly parses all cases from AC1 table', () => {
      // Basic decimal representations
      expect(parseMoneyInput('12.5')).toBe(1250);
      expect(parseMoneyInput('12,50')).toBe(1250);
      expect(parseMoneyInput('12.')).toBe(1200);
      expect(parseMoneyInput('.5')).toBe(50);
      expect(parseMoneyInput('0.05')).toBe(5);
      expect(parseMoneyInput('0')).toBe(0);

      // Whitespace and non-breaking spaces
      expect(parseMoneyInput('1 000,5')).toBe(100050);
      expect(parseMoneyInput('1\u00A0000,5')).toBe(100050); // NBSP
      expect(parseMoneyInput('1\u202F000,5')).toBe(100050); // narrow NBSP
      expect(parseMoneyInput('1\u2009000,5')).toBe(100050); // thin space

      // Mixed grouping and decimal separators
      expect(parseMoneyInput('1,000.50')).toBe(100050);
      expect(parseMoneyInput('1.000,50')).toBe(100050);
      expect(parseMoneyInput('1,234,567.89')).toBe(123456789);

      // Single separator grouping
      expect(parseMoneyInput('1,000')).toBe(100000);
      expect(parseMoneyInput('1.234')).toBe(123400);
      expect(parseMoneyInput('1,000,000')).toBe(100000000);
      expect(parseMoneyInput('1.000.000')).toBe(100000000);

      // Dot grouping with comma decimal
      expect(parseMoneyInput('12.345,6')).toBe(1234560);

      // Invalid decimal fractions or invalid groupings
      expect(parseMoneyInput('1.2345')).toBeNull();
      expect(parseMoneyInput('1.234,567')).toBeNull();
      expect(parseMoneyInput('1,234.567')).toBeNull();
      expect(parseMoneyInput('1,23,4')).toBeNull();

      // Empty and separator-only inputs
      expect(parseMoneyInput('')).toBeNull();
      expect(parseMoneyInput('   ')).toBeNull();
      expect(parseMoneyInput('.')).toBeNull();
      expect(parseMoneyInput(',')).toBeNull();

      // Non-numeric characters, signs, exponents, unicode digits
      expect(parseMoneyInput('abc')).toBeNull();
      expect(parseMoneyInput('12a')).toBeNull();
      expect(parseMoneyInput('1e3')).toBeNull();
      expect(parseMoneyInput('١٢')).toBeNull();
      expect(parseMoneyInput('-5')).toBeNull();
      expect(parseMoneyInput('+5')).toBeNull();

      // Boundary values
      expect(parseMoneyInput('1000000000.00')).toBe(MAX_AMOUNT); // 10^11 minor units
      expect(parseMoneyInput('1000000000.01')).toBeNull(); // MAX_AMOUNT + 1
      expect(parseMoneyInput('10000000000.00')).toBeNull(); // 10x MAX_AMOUNT
    });

    it('handles Swiss and Liechtenstein apostrophe thousand separators', () => {
      expect(parseMoneyInput("1'000.50")).toBe(100050);
      expect(parseMoneyInput('1’000.50')).toBe(100050);
      expect(parseMoneyInput("1'234'567.89")).toBe(123456789);
      expect(parseMoneyInput("1'234'567,89")).toBe(123456789);
    });

    it('handles leading zeros properly', () => {
      expect(parseMoneyInput('00.00')).toBe(0);
      expect(parseMoneyInput('000')).toBe(0);
      expect(parseMoneyInput('0012.50')).toBe(1250);
      expect(parseMoneyInput('.0')).toBe(0);
      expect(parseMoneyInput('.00')).toBe(0);
    });

    it('rejects malformed grouping or multiple decimal separators', () => {
      // Both separators present, but malformed grouping
      expect(parseMoneyInput('1234,567.89')).toBeNull(); // First group has 4 digits
      expect(parseMoneyInput('1.2.3,45')).toBeNull();
      expect(parseMoneyInput('1,2.3,45')).toBeNull();
      expect(parseMoneyInput('1,000.50.00')).toBeNull(); // Multiple dots when comma present
      expect(parseMoneyInput('1.000,50,00')).toBeNull(); // Multiple commas when dot present

      // Leading separator with more than 2 decimal digits
      expect(parseMoneyInput('.500')).toBeNull();
      expect(parseMoneyInput(',1234')).toBeNull();

      // Single separator with malformed grouping
      expect(parseMoneyInput('1234,567')).toBeNull();
      expect(parseMoneyInput('1,2345,678')).toBeNull();
      expect(parseMoneyInput('1.2.3')).toBeNull();

      // Only multiple separators without digits
      expect(parseMoneyInput('.,')).toBeNull();
      expect(parseMoneyInput(',.')).toBeNull();
      expect(parseMoneyInput('..')).toBeNull();
      expect(parseMoneyInput(',,')).toBeNull();

      // Extremely large numbers that would overflow digits
      expect(parseMoneyInput('999999999999999999999')).toBeNull();

      // Non-string inputs at runtime
      // @ts-expect-error Testing invalid runtime input type
      expect(parseMoneyInput(null)).toBeNull();
      // @ts-expect-error Testing invalid runtime input type
      expect(parseMoneyInput(undefined)).toBeNull();
      // @ts-expect-error Testing invalid runtime input type
      expect(parseMoneyInput(123)).toBeNull();
    });
  });

  describe('formatMoney (AC2)', () => {
    it('formats EN and RU correctly for USD and UAH', () => {
      // EN USD
      expect(formatMoney(1050, { locale: 'en', currency: 'USD' })).toBe(
        '$10.50',
      );

      // RU UAH (matches 10,50 ₴ with space or non-breaking space)
      const formattedUahRu = formatMoney(1050, {
        locale: 'ru',
        currency: 'UAH',
      });
      // Normalize NBSP / NNBSP to regular space for flexible assertion
      const normalizedUahRu = formattedUahRu.replace(/[\u00A0\u202F]/g, ' ');
      expect(normalizedUahRu).toBe('10,50 ₴');
    });

    it('formats all 9 supported currencies for both en and ru locales', () => {
      for (const currency of SUPPORTED_CURRENCIES) {
        const enOutput = formatMoney(1250, { locale: 'en', currency });
        expect(enOutput).toBeDefined();
        expect(enOutput.length).toBeGreaterThan(0);
        // All supported currencies have 2 decimal fraction digits
        expect(enOutput).toMatch(/12\.50/);

        const ruOutput = formatMoney(1250, { locale: 'ru', currency });
        expect(ruOutput).toBeDefined();
        expect(ruOutput.length).toBeGreaterThan(0);
        expect(ruOutput).toMatch(/12,50/);
      }
    });

    it('formats zero, negative zero, negative amounts, and large balances properly', () => {
      // Zero
      expect(formatMoney(0, { locale: 'en', currency: 'USD' })).toBe('$0.00');
      expect(formatMoney(-0, { locale: 'en', currency: 'USD' })).toBe('$0.00');

      // Negative amounts (e.g. for account balance)
      expect(formatMoney(-1050, { locale: 'en', currency: 'USD' })).toBe(
        '-$10.50',
      );

      // Large balance (MAX_BALANCE = 10^12 minor units)
      const maxBalanceFormatted = formatMoney(MAX_BALANCE, {
        locale: 'en',
        currency: 'USD',
      });
      expect(maxBalanceFormatted).toBe('$10,000,000,000.00');
    });
  });

  describe('formatMoneyInput', () => {
    it('formats minor units to locale-specific editable strings without thousands separators', () => {
      // English (period separator)
      expect(formatMoneyInput(1250, 'en')).toBe('12.50');
      expect(formatMoneyInput(1200, 'en')).toBe('12.00');
      expect(formatMoneyInput(50, 'en')).toBe('0.50');
      expect(formatMoneyInput(5, 'en')).toBe('0.05');
      expect(formatMoneyInput(0, 'en')).toBe('0.00');
      expect(formatMoneyInput(100050, 'en')).toBe('1000.50');
      expect(formatMoneyInput(-1250, 'en')).toBe('-12.50');

      // Russian (comma separator)
      expect(formatMoneyInput(1250, 'ru')).toBe('12,50');
      expect(formatMoneyInput(1200, 'ru')).toBe('12,00');
      expect(formatMoneyInput(50, 'ru')).toBe('0,50');
      expect(formatMoneyInput(5, 'ru')).toBe('0,05');
      expect(formatMoneyInput(0, 'ru')).toBe('0,00');
      expect(formatMoneyInput(100050, 'ru')).toBe('1000,50');
      expect(formatMoneyInput(-1250, 'ru')).toBe('-12,50');
    });
  });

  describe('signedAmount', () => {
    it('returns positive value for income and negative value for expense', () => {
      expect(signedAmount('income', 1250)).toBe(1250);
      expect(signedAmount('expense', 1250)).toBe(-1250);
    });

    it('returns 0 for zero amount without negative zero quirks', () => {
      expect(signedAmount('income', 0)).toBe(0);
      expect(signedAmount('expense', 0)).toBe(0);
      expect(Object.is(signedAmount('expense', 0), -0)).toBe(false);
    });

    it('handles negative inputs safely and idempotently', () => {
      expect(signedAmount('income', -500)).toBe(500);
      expect(signedAmount('expense', -500)).toBe(-500);
    });
  });

  describe('fromMinorUnits', () => {
    it('converts minor units to major units', () => {
      expect(fromMinorUnits(1250)).toBe(12.5);
      expect(fromMinorUnits(0)).toBe(0);
      expect(fromMinorUnits(5)).toBe(0.05);
      expect(fromMinorUnits(-1250)).toBe(-12.5);
    });
  });
});
