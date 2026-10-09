import { describe, expect, it } from 'vitest';
import { MAX_AMOUNT } from '@/lib/limits';
import {
  budgetInputSchema,
  budgetSchema,
  budgetUpdateInputSchema,
} from './schemas';

describe('budgets schemas', () => {
  describe('budgetInputSchema', () => {
    it('accepts valid budget input', () => {
      const input = {
        categoryId: 'cat-groceries',
        month: '2026-09',
        limit: 50000,
      };
      const parsed = budgetInputSchema.parse(input);
      expect(parsed).toEqual(input);
    });

    it('rejects invalid limit values: 0, negative, floats, > MAX_AMOUNT, missing', () => {
      const base = {
        categoryId: 'cat-groceries',
        month: '2026-09',
      };

      const zeroRes = budgetInputSchema.safeParse({ ...base, limit: 0 });
      expect(zeroRes.success).toBe(false);
      if (!zeroRes.success) {
        expect(zeroRes.error.issues[0]?.message).toBe(
          'validation.amountPositive',
        );
      }

      const negRes = budgetInputSchema.safeParse({ ...base, limit: -500 });
      expect(negRes.success).toBe(false);
      if (!negRes.success) {
        expect(negRes.error.issues[0]?.message).toBe(
          'validation.amountPositive',
        );
      }

      const floatRes = budgetInputSchema.safeParse({ ...base, limit: 12.5 });
      expect(floatRes.success).toBe(false);
      if (!floatRes.success) {
        expect(floatRes.error.issues[0]?.message).toBe(
          'validation.amountPositive',
        );
      }

      const tooLargeRes = budgetInputSchema.safeParse({
        ...base,
        limit: MAX_AMOUNT + 1,
      });
      expect(tooLargeRes.success).toBe(false);
      if (!tooLargeRes.success) {
        expect(tooLargeRes.error.issues[0]?.message).toBe(
          'validation.amountTooLarge',
        );
      }

      const missingRes = budgetInputSchema.safeParse(base);
      expect(missingRes.success).toBe(false);
      if (!missingRes.success) {
        expect(missingRes.error.issues[0]?.message).toBe('validation.required');
      }
    });

    it('rejects invalid month formats with validation.dateInvalid', () => {
      const base = {
        categoryId: 'cat-groceries',
        limit: 50000,
      };

      const invalidMonths = ['2026-13', '2026-00', '2026-9', 'invalid', ''];
      for (const month of invalidMonths) {
        const result = budgetInputSchema.safeParse({ ...base, month });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0]?.message).toBe(
            'validation.dateInvalid',
          );
        }
      }
    });

    it('rejects categoryId empty or longer than 64 characters', () => {
      const emptyRes = budgetInputSchema.safeParse({
        categoryId: '',
        month: '2026-09',
        limit: 50000,
      });
      expect(emptyRes.success).toBe(false);
      if (!emptyRes.success) {
        expect(emptyRes.error.issues[0]?.message).toBe('validation.required');
      }

      const tooLongRes = budgetInputSchema.safeParse({
        categoryId: 'a'.repeat(65),
        month: '2026-09',
        limit: 50000,
      });
      expect(tooLongRes.success).toBe(false);
      if (!tooLongRes.success) {
        expect(tooLongRes.error.issues[0]?.message).toBe('validation.tooLong');
      }
    });
  });

  describe('budgetUpdateInputSchema', () => {
    it('accepts valid budget update input', () => {
      const input = { limit: 75000 };
      const parsed = budgetUpdateInputSchema.parse(input);
      expect(parsed).toEqual(input);
    });

    it('rejects invalid limit in update schema', () => {
      expect(budgetUpdateInputSchema.safeParse({ limit: 0 }).success).toBe(
        false,
      );
      expect(budgetUpdateInputSchema.safeParse({ limit: -100 }).success).toBe(
        false,
      );
      expect(budgetUpdateInputSchema.safeParse({ limit: 99.9 }).success).toBe(
        false,
      );
      expect(
        budgetUpdateInputSchema.safeParse({ limit: MAX_AMOUNT + 1 }).success,
      ).toBe(false);
      expect(budgetUpdateInputSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('budgetSchema', () => {
    it('accepts valid budget document when id matches month_categoryId', () => {
      const now = new Date();
      const doc = {
        id: '2026-09_cat-groceries',
        categoryId: 'cat-groceries',
        month: '2026-09',
        limit: 50000,
        createdAt: now,
        updatedAt: now,
      };
      const parsed = budgetSchema.parse(doc);
      expect(parsed.id).toBe('2026-09_cat-groceries');
      expect(parsed.createdAt).toBe(now);
      expect(parsed.updatedAt).toBe(now);
    });

    it('rejects budget document when id does not match month_categoryId invariant', () => {
      const now = new Date();
      const doc = {
        id: 'wrong-id-format',
        categoryId: 'cat-groceries',
        month: '2026-09',
        limit: 50000,
        createdAt: now,
        updatedAt: now,
      };
      const result = budgetSchema.safeParse(doc);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.required');
        expect(result.error.issues[0]?.path).toEqual(['id']);
      }
    });

    it('rejects document missing id, createdAt, or updatedAt', () => {
      const doc = {
        categoryId: 'cat-groceries',
        month: '2026-09',
        limit: 50000,
      };
      expect(budgetSchema.safeParse(doc).success).toBe(false);
    });

    it('rejects document with non-date createdAt/updatedAt', () => {
      const doc = {
        id: '2026-09_cat-groceries',
        categoryId: 'cat-groceries',
        month: '2026-09',
        limit: 50000,
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      };
      expect(budgetSchema.safeParse(doc).success).toBe(false);
    });
  });
});
