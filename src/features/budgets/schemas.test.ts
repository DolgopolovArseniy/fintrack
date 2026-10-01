import { describe, expect, it } from 'vitest';
import { MAX_AMOUNT } from '@/lib/limits';
import { budgetInputSchema, budgetSchema } from './schemas';

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

    it('rejects invalid limit values: 0, negative, floats, > MAX_AMOUNT', () => {
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
    });

    it('rejects invalid month formats with validation.dateInvalid', () => {
      const base = {
        categoryId: 'cat-groceries',
        limit: 50000,
      };

      const invalidMonths = ['2026-13', '2026-00', '2026-9', 'invalid'];
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

    it('rejects categoryId longer than 64 characters with validation.tooLong', () => {
      const input = {
        categoryId: 'a'.repeat(65),
        month: '2026-09',
        limit: 50000,
      };
      const result = budgetInputSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.tooLong');
      }
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
  });
});
