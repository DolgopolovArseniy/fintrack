import { describe, expect, it } from 'vitest';
import { MAX_BALANCE } from '@/lib/limits';
import { ACCOUNT_TYPES } from './constants';
import {
  accountBalanceSchema,
  accountInputSchema,
  accountSchema,
  accountTypeSchema,
} from './schemas';

describe('accounts schemas', () => {
  describe('accountTypeSchema', () => {
    it('accepts valid account types: cash, card, bank', () => {
      for (const type of ACCOUNT_TYPES) {
        expect(accountTypeSchema.parse(type)).toBe(type);
      }
    });

    it('rejects unsupported account types with validation.required', () => {
      const result = accountTypeSchema.safeParse('crypto');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.required');
      }
    });
  });

  describe('accountBalanceSchema', () => {
    it('accepts 0, positive and negative integers within ±MAX_BALANCE', () => {
      expect(accountBalanceSchema.parse(0)).toBe(0);
      expect(accountBalanceSchema.parse(1000)).toBe(1000);
      expect(accountBalanceSchema.parse(-5000)).toBe(-5000);
      expect(accountBalanceSchema.parse(MAX_BALANCE)).toBe(MAX_BALANCE);
      expect(accountBalanceSchema.parse(-MAX_BALANCE)).toBe(-MAX_BALANCE);
    });

    it('rejects values beyond ±MAX_BALANCE with validation.amountTooLarge', () => {
      const tooLarge = accountBalanceSchema.safeParse(MAX_BALANCE + 1);
      expect(tooLarge.success).toBe(false);
      if (!tooLarge.success) {
        expect(tooLarge.error.issues[0]?.message).toBe(
          'validation.amountTooLarge',
        );
      }

      const tooSmall = accountBalanceSchema.safeParse(-MAX_BALANCE - 1);
      expect(tooSmall.success).toBe(false);
      if (!tooSmall.success) {
        expect(tooSmall.error.issues[0]?.message).toBe(
          'validation.amountTooLarge',
        );
      }
    });

    it('rejects floating point values and non-numbers', () => {
      expect(accountBalanceSchema.safeParse(12.5).success).toBe(false);
      expect(accountBalanceSchema.safeParse('100').success).toBe(false);
      expect(accountBalanceSchema.safeParse(null).success).toBe(false);
    });
  });

  describe('accountInputSchema', () => {
    it('accepts valid input with name only', () => {
      const input = {
        type: 'card' as const,
        initialBalance: 5000,
        name: 'Debit Card',
      };
      const parsed = accountInputSchema.parse(input);
      expect(parsed.name).toBe('Debit Card');
      expect(parsed.archived).toBe(false);
      expect(parsed.systemKey).toBeUndefined();
    });

    it('accepts valid input with systemKey only', () => {
      const input = {
        type: 'cash' as const,
        initialBalance: 0,
        systemKey: 'main',
        archived: true,
      };
      const parsed = accountInputSchema.parse(input);
      expect(parsed.systemKey).toBe('main');
      expect(parsed.archived).toBe(true);
      expect(parsed.name).toBeUndefined();
    });

    it('accepts valid input with both name and systemKey', () => {
      const input = {
        type: 'bank' as const,
        initialBalance: 100000,
        name: 'Checking Account',
        systemKey: 'main',
      };
      const parsed = accountInputSchema.parse(input);
      expect(parsed.name).toBe('Checking Account');
      expect(parsed.systemKey).toBe('main');
    });

    it('rejects account input when both name and systemKey are missing', () => {
      const input = {
        type: 'card' as const,
        initialBalance: 1000,
      };
      const result = accountInputSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.required');
        expect(result.error.issues[0]?.path).toEqual(['name']);
      }
    });

    it('rejects name longer than 40 chars with validation.tooLong', () => {
      const input = {
        type: 'card' as const,
        initialBalance: 1000,
        name: 'a'.repeat(41),
      };
      const result = accountInputSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.tooLong');
      }
    });

    it('rejects systemKey longer than 30 chars with validation.tooLong', () => {
      const input = {
        type: 'card' as const,
        initialBalance: 1000,
        systemKey: 'a'.repeat(31),
      };
      const result = accountInputSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.tooLong');
      }
    });
  });

  describe('accountSchema', () => {
    it('accepts valid account document with id, balance, and dates', () => {
      const now = new Date();
      const doc = {
        id: 'acc-main',
        type: 'cash' as const,
        balance: 15000,
        initialBalance: 5000,
        archived: false,
        systemKey: 'main',
        createdAt: now,
        updatedAt: now,
      };
      const parsed = accountSchema.parse(doc);
      expect(parsed.id).toBe('acc-main');
      expect(parsed.balance).toBe(15000);
      expect(parsed.createdAt).toBe(now);
      expect(parsed.updatedAt).toBe(now);
    });

    it('rejects account document when neither name nor systemKey is present', () => {
      const now = new Date();
      const doc = {
        id: 'acc-bad',
        type: 'cash' as const,
        balance: 0,
        initialBalance: 0,
        archived: false,
        createdAt: now,
        updatedAt: now,
      };
      expect(accountSchema.safeParse(doc).success).toBe(false);
    });

    it('rejects document missing id or dates', () => {
      const doc = {
        type: 'card' as const,
        balance: 0,
        initialBalance: 0,
        archived: false,
        name: 'My Card',
      };
      expect(accountSchema.safeParse(doc).success).toBe(false);
    });
  });
});
