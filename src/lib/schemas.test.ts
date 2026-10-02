import { describe, expect, it } from 'vitest';
import { MAX_AMOUNT } from './limits';
import {
  currencySchema,
  isoDateSchema,
  moneyAmountSchema,
  transactionTypeSchema,
  yearMonthSchema,
} from './schemas';

describe('schemas', () => {
  describe('moneyAmountSchema', () => {
    it('accepts valid minor unit amounts within [1, MAX_AMOUNT]', () => {
      expect(moneyAmountSchema.parse(1)).toBe(1);
      expect(moneyAmountSchema.parse(100)).toBe(100);
      expect(moneyAmountSchema.parse(1250)).toBe(1250);
      expect(moneyAmountSchema.parse(MAX_AMOUNT)).toBe(MAX_AMOUNT);
    });

    it('rejects non-positive and non-integer values with validation.amountPositive', () => {
      const zeroResult = moneyAmountSchema.safeParse(0);
      expect(zeroResult.success).toBe(false);
      if (!zeroResult.success) {
        expect(zeroResult.error.issues[0]?.message).toBe(
          'validation.amountPositive',
        );
      }

      const negativeResult = moneyAmountSchema.safeParse(-1);
      expect(negativeResult.success).toBe(false);
      if (!negativeResult.success) {
        expect(negativeResult.error.issues[0]?.message).toBe(
          'validation.amountPositive',
        );
      }

      const floatResult = moneyAmountSchema.safeParse(1.5);
      expect(floatResult.success).toBe(false);
      if (!floatResult.success) {
        expect(floatResult.error.issues[0]?.message).toBe(
          'validation.amountPositive',
        );
      }
    });

    it('rejects values exceeding MAX_AMOUNT with validation.amountTooLarge', () => {
      const tooLargeResult = moneyAmountSchema.safeParse(MAX_AMOUNT + 1);
      expect(tooLargeResult.success).toBe(false);
      if (!tooLargeResult.success) {
        expect(tooLargeResult.error.issues[0]?.message).toBe(
          'validation.amountTooLarge',
        );
      }
    });

    it('rejects missing or non-number values with validation.required', () => {
      const undefinedResult = moneyAmountSchema.safeParse(undefined);
      expect(undefinedResult.success).toBe(false);
      if (!undefinedResult.success) {
        expect(undefinedResult.error.issues[0]?.message).toBe(
          'validation.required',
        );
      }

      const nullResult = moneyAmountSchema.safeParse(null);
      expect(nullResult.success).toBe(false);
      if (!nullResult.success) {
        expect(nullResult.error.issues[0]?.message).toBe('validation.required');
      }
    });
  });

  describe('currencySchema', () => {
    it('accepts all supported currency codes', () => {
      expect(currencySchema.parse('USD')).toBe('USD');
      expect(currencySchema.parse('EUR')).toBe('EUR');
      expect(currencySchema.parse('GBP')).toBe('GBP');
      expect(currencySchema.parse('UAH')).toBe('UAH');
      expect(currencySchema.parse('PLN')).toBe('PLN');
      expect(currencySchema.parse('CZK')).toBe('CZK');
      expect(currencySchema.parse('CHF')).toBe('CHF');
      expect(currencySchema.parse('CAD')).toBe('CAD');
      expect(currencySchema.parse('AUD')).toBe('AUD');
    });

    it('rejects unsupported currency codes with validation.currencyUnsupported', () => {
      const invalidCodes = ['JPY', 'BTC', 'usd', 'XYZ', ''];
      for (const code of invalidCodes) {
        const result = currencySchema.safeParse(code);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]?.message).toBe(
            'validation.currencyUnsupported',
          );
        }
      }
    });

    it('rejects missing currency with validation.required', () => {
      const result = currencySchema.safeParse(undefined);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.required');
      }
    });
  });

  describe('transactionTypeSchema', () => {
    it('accepts expense and income', () => {
      expect(transactionTypeSchema.parse('expense')).toBe('expense');
      expect(transactionTypeSchema.parse('income')).toBe('income');
    });

    it('rejects invalid transaction types with validation.required', () => {
      const invalidTypes = ['transfer', 'other', 'EXPENSE', ''];
      for (const type of invalidTypes) {
        const result = transactionTypeSchema.safeParse(type);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]?.message).toBe('validation.required');
        }
      }

      const undefinedResult = transactionTypeSchema.safeParse(undefined);
      expect(undefinedResult.success).toBe(false);
      if (!undefinedResult.success) {
        expect(undefinedResult.error.issues[0]?.message).toBe(
          'validation.required',
        );
      }
    });
  });

  describe('isoDateSchema', () => {
    it('accepts valid calendar dates in YYYY-MM-DD format', () => {
      expect(isoDateSchema.parse('2024-02-29')).toBe('2024-02-29'); // Leap year
      expect(isoDateSchema.parse('2026-09-30')).toBe('2026-09-30');
      expect(isoDateSchema.parse('2026-12-31')).toBe('2026-12-31');
    });

    it('rejects invalid calendar dates with validation.dateInvalid', () => {
      const invalidDates = [
        '2023-02-29', // Not a leap year
        '2026-09-31', // Sep has only 30 days
        '2026-13-01', // Invalid month
        '2026-00-10', // Invalid month
        '2026-9-1', // Malformed format
        '2026/09/01', // Wrong separator
        'not-a-date',
        '',
      ];

      for (const date of invalidDates) {
        const result = isoDateSchema.safeParse(date);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]?.message).toBe(
            'validation.dateInvalid',
          );
        }
      }
    });

    it('rejects undefined with validation.required', () => {
      const result = isoDateSchema.safeParse(undefined);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.required');
      }
    });
  });

  describe('yearMonthSchema', () => {
    it('accepts valid YYYY-MM values', () => {
      expect(yearMonthSchema.parse('2026-01')).toBe('2026-01');
      expect(yearMonthSchema.parse('2026-12')).toBe('2026-12');
    });

    it('rejects invalid month or malformed formats with validation.dateInvalid', () => {
      const invalidYearMonths = [
        '2026-00',
        '2026-13',
        '2026-1',
        '2026-12-01',
        '2026/01',
        'invalid',
        '',
      ];

      for (const ym of invalidYearMonths) {
        const result = yearMonthSchema.safeParse(ym);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]?.message).toBe(
            'validation.dateInvalid',
          );
        }
      }
    });

    it('rejects undefined with validation.required', () => {
      const result = yearMonthSchema.safeParse(undefined);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.required');
      }
    });
  });
});
