import { describe, expect, it } from 'vitest';
import {
  updateDisplayNameSchema,
  updateCurrencySchema,
  updateLocaleSchema,
  updateThemeSchema,
  updateProfileSchema,
  deleteAccountConfirmationSchema,
  isConfirmationPhraseValid,
  fullUserDataDumpSchema,
  fullUserDumpProfileSchema,
  fullUserDumpAccountSchema,
  fullUserDumpCategorySchema,
  fullUserDumpBudgetSchema,
  fullUserDumpTransactionSchema,
  EXPECTED_CONFIRMATION_PHRASES,
} from './schemas';

describe('settings schemas', () => {
  describe('updateDisplayNameSchema', () => {
    it('accepts valid display names and trims surrounding whitespace', () => {
      const result = updateDisplayNameSchema.parse({
        displayName: '  Alice Johnson  ',
      });
      expect(result.displayName).toBe('Alice Johnson');
    });

    it('accepts an empty string to allow clearing display name', () => {
      const result = updateDisplayNameSchema.parse({ displayName: '' });
      expect(result.displayName).toBe('');
    });

    it('accepts display name up to 60 characters exactly', () => {
      const exact60 = 'A'.repeat(60);
      const result = updateDisplayNameSchema.parse({ displayName: exact60 });
      expect(result.displayName).toBe(exact60);
    });

    it('rejects display name exceeding 60 characters with validation.tooLong', () => {
      const over60 = 'A'.repeat(61);
      const result = updateDisplayNameSchema.safeParse({ displayName: over60 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.tooLong');
      }
    });

    it('rejects missing or non-string input', () => {
      expect(updateDisplayNameSchema.safeParse({}).success).toBe(false);
      expect(
        updateDisplayNameSchema.safeParse({ displayName: 12345 }).success,
      ).toBe(false);
      expect(
        updateDisplayNameSchema.safeParse({ displayName: null }).success,
      ).toBe(false);
    });
  });

  describe('updateCurrencySchema', () => {
    it('accepts all 9 supported currencies', () => {
      const currencies = [
        'USD',
        'EUR',
        'GBP',
        'UAH',
        'PLN',
        'CZK',
        'CHF',
        'CAD',
        'AUD',
      ];
      for (const cur of currencies) {
        const result = updateCurrencySchema.safeParse({ baseCurrency: cur });
        expect(result.success).toBe(true);
      }
    });

    it('rejects unsupported currencies with validation.currencyUnsupported', () => {
      const result = updateCurrencySchema.safeParse({ baseCurrency: 'JPY' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'validation.currencyUnsupported',
        );
      }
    });

    it('rejects missing currency with validation.required', () => {
      const result = updateCurrencySchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.required');
      }
    });
  });

  describe('updateLocaleSchema', () => {
    it('accepts supported locales en and ru', () => {
      expect(updateLocaleSchema.parse({ locale: 'en' })).toEqual({
        locale: 'en',
      });
      expect(updateLocaleSchema.parse({ locale: 'ru' })).toEqual({
        locale: 'ru',
      });
    });

    it('rejects unsupported locale', () => {
      expect(updateLocaleSchema.safeParse({ locale: 'de' }).success).toBe(
        false,
      );
    });
  });

  describe('updateThemeSchema', () => {
    it('accepts valid themes: light, dark, system', () => {
      expect(updateThemeSchema.parse({ theme: 'light' })).toEqual({
        theme: 'light',
      });
      expect(updateThemeSchema.parse({ theme: 'dark' })).toEqual({
        theme: 'dark',
      });
      expect(updateThemeSchema.parse({ theme: 'system' })).toEqual({
        theme: 'system',
      });
    });

    it('rejects invalid theme', () => {
      expect(updateThemeSchema.safeParse({ theme: 'sunset' }).success).toBe(
        false,
      );
    });
  });

  describe('updateProfileSchema', () => {
    it('accepts empty object (all fields optional)', () => {
      const result = updateProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts full profile update payload', () => {
      const result = updateProfileSchema.parse({
        displayName: '  Bob  ',
        baseCurrency: 'EUR',
        locale: 'ru',
        theme: 'dark',
      });
      expect(result).toEqual({
        displayName: 'Bob',
        baseCurrency: 'EUR',
        locale: 'ru',
        theme: 'dark',
      });
    });
  });

  describe('deleteAccountConfirmationSchema', () => {
    it('accepts confirmation phrase without password', () => {
      const result = deleteAccountConfirmationSchema.parse({
        confirmationPhrase: 'DELETE',
      });
      expect(result.confirmationPhrase).toBe('DELETE');
      expect(result.password).toBeUndefined();
    });

    it('accepts confirmation phrase with password', () => {
      const result = deleteAccountConfirmationSchema.parse({
        confirmationPhrase: 'DELETE',
        password: 'my-secret-password-123',
      });
      expect(result.confirmationPhrase).toBe('DELETE');
      expect(result.password).toBe('my-secret-password-123');
    });

    it('rejects empty confirmation phrase with validation.required', () => {
      const result = deleteAccountConfirmationSchema.safeParse({
        confirmationPhrase: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.required');
      }
    });
  });

  describe('isConfirmationPhraseValid', () => {
    it('returns true for exact match', () => {
      expect(isConfirmationPhraseValid('DELETE', 'DELETE')).toBe(true);
      expect(isConfirmationPhraseValid('УДАЛИТЬ', 'УДАЛИТЬ')).toBe(true);
    });

    it('returns true regardless of case and surrounding whitespace', () => {
      expect(isConfirmationPhraseValid('  delete  ', 'DELETE')).toBe(true);
      expect(isConfirmationPhraseValid('DeLeTe', 'DELETE')).toBe(true);
      expect(isConfirmationPhraseValid('  удалить ', 'УДАЛИТЬ')).toBe(true);
      expect(isConfirmationPhraseValid('Удалить', 'УДАЛИТЬ')).toBe(true);
    });

    it('returns false when phrases do not match', () => {
      expect(isConfirmationPhraseValid('DEL', 'DELETE')).toBe(false);
      expect(isConfirmationPhraseValid('CANCEL', 'DELETE')).toBe(false);
      expect(isConfirmationPhraseValid('', 'DELETE')).toBe(false);
      expect(isConfirmationPhraseValid('УДАЛИТ', 'УДАЛИТЬ')).toBe(false);
    });

    it('defaults to DELETE when expected phrase is omitted', () => {
      expect(isConfirmationPhraseValid('DELETE')).toBe(true);
      expect(isConfirmationPhraseValid('delete')).toBe(true);
      expect(isConfirmationPhraseValid('other')).toBe(false);
    });

    it('exports expected confirmation phrases constant', () => {
      expect(EXPECTED_CONFIRMATION_PHRASES).toEqual(['DELETE', 'УДАЛИТЬ']);
    });
  });

  describe('FullUserDataDump sub-schemas', () => {
    it('validates fullUserDumpProfileSchema', () => {
      const profile = {
        uid: 'user-1',
        email: 'user@example.com',
        displayName: 'User One',
        baseCurrency: 'USD',
        locale: 'en',
        theme: 'light',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      };
      expect(fullUserDumpProfileSchema.parse(profile)).toEqual(profile);
    });

    it('allows null email and displayName in profile', () => {
      const profile = {
        uid: 'user-anon',
        email: null,
        displayName: null,
        baseCurrency: 'USD',
        locale: 'en',
        theme: 'system',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      };
      expect(fullUserDumpProfileSchema.parse(profile)).toEqual(profile);
    });

    it('validates fullUserDumpAccountSchema with and without optional name/systemKey', () => {
      const acc = {
        id: 'acc-1',
        name: 'Checking',
        type: 'checking',
        balance: 10000,
        initialBalance: 0,
        archived: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      };
      expect(fullUserDumpAccountSchema.parse(acc)).toEqual(acc);
    });

    it('validates fullUserDumpCategorySchema', () => {
      const cat = {
        id: 'cat-1',
        systemKey: 'groceries',
        type: 'expense',
        icon: 'shopping-cart',
        color: 'emerald',
        archived: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      };
      expect(fullUserDumpCategorySchema.parse(cat)).toEqual(cat);
    });

    it('validates fullUserDumpBudgetSchema', () => {
      const budget = {
        id: 'budget-1',
        categoryId: 'cat-1',
        month: '2026-10',
        limit: 50000,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      };
      expect(fullUserDumpBudgetSchema.parse(budget)).toEqual(budget);
    });

    it('validates fullUserDumpTransactionSchema', () => {
      const tx = {
        id: 'tx-1',
        type: 'expense',
        amount: 2500,
        accountId: 'acc-1',
        categoryId: 'cat-1',
        date: '2026-10-15',
        note: 'Supermarket',
        tags: ['food', 'groceries'],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      };
      expect(fullUserDumpTransactionSchema.parse(tx)).toEqual(tx);
    });
  });

  describe('fullUserDataDumpSchema', () => {
    it('validates complete valid dump', () => {
      const dump = {
        version: 1,
        exportedAt: '2026-10-19T12:00:00.000Z',
        appName: 'FinTrack',
        profile: {
          uid: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          baseCurrency: 'USD',
          locale: 'en',
          theme: 'dark',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
        accounts: [],
        categories: [],
        budgets: [],
        transactions: [],
      };
      expect(fullUserDataDumpSchema.parse(dump)).toEqual(dump);
    });

    it('rejects invalid exportedAt datetime', () => {
      const invalid = {
        version: 1,
        exportedAt: 'not-a-date',
        appName: 'FinTrack',
        profile: {
          uid: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          baseCurrency: 'USD',
          locale: 'en',
          theme: 'dark',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
        accounts: [],
        categories: [],
        budgets: [],
        transactions: [],
      };
      expect(fullUserDataDumpSchema.safeParse(invalid).success).toBe(false);
    });
  });
});
