import { describe, expect, it } from 'vitest';
import { MAX_AMOUNT } from '@/lib/limits';
import { transactionInputSchema, transactionSchema } from './schemas';

describe('transactions schemas', () => {
  describe('transactionInputSchema', () => {
    it('accepts valid minimal transaction input', () => {
      const input = {
        type: 'expense' as const,
        amount: 2500,
        accountId: 'acc-1',
        categoryId: 'cat-1',
        date: '2026-09-30',
      };
      const parsed = transactionInputSchema.parse(input);
      expect(parsed.amount).toBe(2500);
      expect(parsed.note).toBeUndefined();
      expect(parsed.tags).toBeUndefined();
    });

    it('accepts valid full transaction input with note and tags', () => {
      const input = {
        type: 'income' as const,
        amount: 100000,
        accountId: 'acc-main',
        categoryId: 'cat-salary',
        date: '2026-09-01',
        note: 'Monthly salary payout',
        tags: ['salary', 'work'],
      };
      const parsed = transactionInputSchema.parse(input);
      expect(parsed.note).toBe('Monthly salary payout');
      expect(parsed.tags).toEqual(['salary', 'work']);
    });

    it('rejects invalid amounts: 0, negative, floats, > MAX_AMOUNT (AC7)', () => {
      const base = {
        type: 'expense' as const,
        accountId: 'acc-1',
        categoryId: 'cat-1',
        date: '2026-09-30',
      };

      // 0
      const zeroRes = transactionInputSchema.safeParse({ ...base, amount: 0 });
      expect(zeroRes.success).toBe(false);
      if (!zeroRes.success) {
        expect(zeroRes.error.issues[0]?.message).toBe(
          'validation.amountPositive',
        );
      }

      // -1
      const negRes = transactionInputSchema.safeParse({ ...base, amount: -1 });
      expect(negRes.success).toBe(false);
      if (!negRes.success) {
        expect(negRes.error.issues[0]?.message).toBe(
          'validation.amountPositive',
        );
      }

      // 1.5
      const floatRes = transactionInputSchema.safeParse({
        ...base,
        amount: 1.5,
      });
      expect(floatRes.success).toBe(false);
      if (!floatRes.success) {
        expect(floatRes.error.issues[0]?.message).toBe(
          'validation.amountPositive',
        );
      }

      // MAX_AMOUNT + 1
      const tooLargeRes = transactionInputSchema.safeParse({
        ...base,
        amount: MAX_AMOUNT + 1,
      });
      expect(tooLargeRes.success).toBe(false);
      if (!tooLargeRes.success) {
        expect(tooLargeRes.error.issues[0]?.message).toBe(
          'validation.amountTooLarge',
        );
      }
    });

    it('rejects note longer than 200 characters with validation.tooLong (AC7)', () => {
      const input = {
        type: 'expense' as const,
        amount: 500,
        accountId: 'acc-1',
        categoryId: 'cat-1',
        date: '2026-09-30',
        note: 'a'.repeat(201),
      };
      const result = transactionInputSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.tooLong');
      }
    });

    it('accepts note with exactly 200 characters', () => {
      const input = {
        type: 'expense' as const,
        amount: 500,
        accountId: 'acc-1',
        categoryId: 'cat-1',
        date: '2026-09-30',
        note: 'a'.repeat(200),
      };
      expect(transactionInputSchema.safeParse(input).success).toBe(true);
    });

    it('rejects invalid dates: format, leap years, non-existent dates (AC7)', () => {
      const base = {
        type: 'expense' as const,
        amount: 500,
        accountId: 'acc-1',
        categoryId: 'cat-1',
      };

      const invalidDates = [
        'invalid-date',
        '2023-02-29', // not a leap year
        '2026-13-01',
        '2026-09-31', // Sept only has 30 days
      ];

      for (const date of invalidDates) {
        const result = transactionInputSchema.safeParse({ ...base, date });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]?.message).toBe(
            'validation.dateInvalid',
          );
        }
      }
    });

    it('accepts leap year date 2024-02-29', () => {
      const input = {
        type: 'expense' as const,
        amount: 500,
        accountId: 'acc-1',
        categoryId: 'cat-1',
        date: '2024-02-29',
      };
      expect(transactionInputSchema.safeParse(input).success).toBe(true);
    });

    it('accepts up to 10 tags and rejects more than 10 tags', () => {
      const base = {
        type: 'expense' as const,
        amount: 500,
        accountId: 'acc-1',
        categoryId: 'cat-1',
        date: '2026-09-30',
      };

      const validTags = Array.from({ length: 10 }, (_, i) => `tag-${i}`);
      expect(
        transactionInputSchema.safeParse({ ...base, tags: validTags }).success,
      ).toBe(true);

      const tooManyTags = Array.from({ length: 11 }, (_, i) => `tag-${i}`);
      const result = transactionInputSchema.safeParse({
        ...base,
        tags: tooManyTags,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.tooLong');
      }
    });

    it('rejects tag longer than 30 characters', () => {
      const input = {
        type: 'expense' as const,
        amount: 500,
        accountId: 'acc-1',
        categoryId: 'cat-1',
        date: '2026-09-30',
        tags: ['a'.repeat(31)],
      };
      expect(transactionInputSchema.safeParse(input).success).toBe(false);
    });
  });

  describe('transactionSchema', () => {
    it('accepts valid transaction document with id and dates', () => {
      const now = new Date();
      const doc = {
        id: 'tx-100',
        type: 'expense' as const,
        amount: 2500,
        accountId: 'acc-1',
        categoryId: 'cat-1',
        date: '2026-09-30',
        createdAt: now,
        updatedAt: now,
      };
      const parsed = transactionSchema.parse(doc);
      expect(parsed.id).toBe('tx-100');
      expect(parsed.createdAt).toBe(now);
      expect(parsed.updatedAt).toBe(now);
    });

    it('rejects document missing id, createdAt, or updatedAt', () => {
      const doc = {
        type: 'expense' as const,
        amount: 2500,
        accountId: 'acc-1',
        categoryId: 'cat-1',
        date: '2026-09-30',
      };
      expect(transactionSchema.safeParse(doc).success).toBe(false);
    });
  });
});
