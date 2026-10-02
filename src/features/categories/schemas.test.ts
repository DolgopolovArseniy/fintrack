import { describe, expect, it } from 'vitest';
import { CATEGORY_COLOR_KEYS } from './constants';
import {
  categoryColorSchema,
  categoryInputSchema,
  categorySchema,
} from './schemas';

describe('categories schemas', () => {
  describe('categoryColorSchema', () => {
    it('accepts all 12 supported category color keys', () => {
      for (const color of CATEGORY_COLOR_KEYS) {
        expect(categoryColorSchema.parse(color)).toBe(color);
      }
    });

    it('rejects unsupported colors with validation.required', () => {
      const result = categoryColorSchema.safeParse('crimson');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.required');
      }
    });
  });

  describe('categoryInputSchema', () => {
    it('accepts valid category input with name only', () => {
      const input = {
        type: 'expense' as const,
        icon: 'coffee',
        color: 'amber' as const,
        name: 'Coffee & Snacks',
      };
      const parsed = categoryInputSchema.parse(input);
      expect(parsed.name).toBe('Coffee & Snacks');
      expect(parsed.archived).toBe(false);
      expect(parsed.systemKey).toBeUndefined();
    });

    it('accepts valid category input with systemKey only', () => {
      const input = {
        type: 'income' as const,
        icon: 'wallet',
        color: 'emerald' as const,
        systemKey: 'salary',
        archived: true,
      };
      const parsed = categoryInputSchema.parse(input);
      expect(parsed.systemKey).toBe('salary');
      expect(parsed.archived).toBe(true);
      expect(parsed.name).toBeUndefined();
    });

    it('accepts valid category input with both name and systemKey', () => {
      const input = {
        type: 'expense' as const,
        icon: 'utensils',
        color: 'orange' as const,
        name: 'Groceries',
        systemKey: 'food',
      };
      const parsed = categoryInputSchema.parse(input);
      expect(parsed.name).toBe('Groceries');
      expect(parsed.systemKey).toBe('food');
    });

    it('rejects category input when both name and systemKey are missing', () => {
      const input = {
        type: 'expense' as const,
        icon: 'utensils',
        color: 'orange' as const,
      };
      const result = categoryInputSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.required');
        expect(result.error.issues[0]?.path).toEqual(['name']);
      }
    });

    it('rejects category input when name and systemKey are whitespace only', () => {
      const input = {
        type: 'expense' as const,
        icon: 'utensils',
        color: 'orange' as const,
        name: '   ',
        systemKey: '  ',
      };
      const result = categoryInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects name longer than 40 chars with validation.tooLong', () => {
      const input = {
        type: 'expense' as const,
        icon: 'utensils',
        color: 'orange' as const,
        name: 'a'.repeat(41),
      };
      const result = categoryInputSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.tooLong');
      }
    });

    it('rejects systemKey longer than 30 chars with validation.tooLong', () => {
      const input = {
        type: 'expense' as const,
        icon: 'utensils',
        color: 'orange' as const,
        systemKey: 'a'.repeat(31),
      };
      const result = categoryInputSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.tooLong');
      }
    });

    it('rejects icon longer than 40 chars with validation.tooLong', () => {
      const input = {
        type: 'expense' as const,
        icon: 'a'.repeat(41),
        color: 'orange' as const,
        name: 'Test',
      };
      const result = categoryInputSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.tooLong');
      }
    });
  });

  describe('categorySchema', () => {
    it('accepts valid category document with id, createdAt and updatedAt', () => {
      const now = new Date();
      const doc = {
        id: 'cat-food',
        type: 'expense' as const,
        icon: 'utensils',
        color: 'orange' as const,
        systemKey: 'food',
        archived: false,
        createdAt: now,
        updatedAt: now,
      };
      const parsed = categorySchema.parse(doc);
      expect(parsed.id).toBe('cat-food');
      expect(parsed.createdAt).toBe(now);
      expect(parsed.updatedAt).toBe(now);
    });

    it('rejects category document without id or missing dates', () => {
      const doc = {
        type: 'expense' as const,
        icon: 'utensils',
        color: 'orange' as const,
        name: 'Food',
        archived: false,
      };
      expect(categorySchema.safeParse(doc).success).toBe(false);
    });

    it('rejects category document with neither name nor systemKey', () => {
      const now = new Date();
      const doc = {
        id: 'cat-bad',
        type: 'expense' as const,
        icon: 'utensils',
        color: 'orange' as const,
        archived: false,
        createdAt: now,
        updatedAt: now,
      };
      expect(categorySchema.safeParse(doc).success).toBe(false);
    });
  });
});
