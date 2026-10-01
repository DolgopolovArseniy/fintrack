import { describe, expect, it } from 'vitest';
import {
  localeSchema,
  themeSchema,
  schemaVersionSchema,
  userProfileInputSchema,
  userProfileSchema,
} from './schemas';

describe('auth schemas', () => {
  describe('localeSchema', () => {
    it('accepts supported locales: en and ru', () => {
      expect(localeSchema.parse('en')).toBe('en');
      expect(localeSchema.parse('ru')).toBe('ru');
    });

    it('rejects unsupported locales with validation.required', () => {
      const result = localeSchema.safeParse('fr');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.required');
      }
    });
  });

  describe('themeSchema', () => {
    it('accepts light, dark, and system themes', () => {
      expect(themeSchema.parse('light')).toBe('light');
      expect(themeSchema.parse('dark')).toBe('dark');
      expect(themeSchema.parse('system')).toBe('system');
    });

    it('rejects invalid themes with validation.required', () => {
      const result = themeSchema.safeParse('neon');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.required');
      }
    });
  });

  describe('schemaVersionSchema', () => {
    it('accepts integer versions between 1 and 1000', () => {
      expect(schemaVersionSchema.parse(1)).toBe(1);
      expect(schemaVersionSchema.parse(1000)).toBe(1000);
    });

    it('rejects values out of [1, 1000] and non-integers', () => {
      expect(schemaVersionSchema.safeParse(0).success).toBe(false);
      expect(schemaVersionSchema.safeParse(1001).success).toBe(false);
      expect(schemaVersionSchema.safeParse(1.5).success).toBe(false);
    });
  });

  describe('userProfileInputSchema', () => {
    it('accepts valid full input', () => {
      const input = {
        baseCurrency: 'USD',
        locale: 'en',
        theme: 'dark',
        schemaVersion: 1,
        displayName: 'John Doe',
      };
      const parsed = userProfileInputSchema.parse(input);
      expect(parsed).toEqual(input);
    });

    it('defaults schemaVersion to 1 and allows optional displayName', () => {
      const input = {
        baseCurrency: 'EUR',
        locale: 'ru',
        theme: 'system',
      };
      const parsed = userProfileInputSchema.parse(input);
      expect(parsed.schemaVersion).toBe(1);
      expect(parsed.displayName).toBeUndefined();
    });

    it('rejects displayName longer than 60 characters with validation.tooLong', () => {
      const input = {
        baseCurrency: 'USD',
        locale: 'en',
        theme: 'light',
        displayName: 'a'.repeat(61),
      };
      const result = userProfileInputSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.tooLong');
      }
    });

    it('rejects unsupported currency with validation.currencyUnsupported', () => {
      const input = {
        baseCurrency: 'XYZ',
        locale: 'en',
        theme: 'light',
      };
      const result = userProfileInputSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'validation.currencyUnsupported',
        );
      }
    });

    it('rejects missing required fields', () => {
      const result = userProfileInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('userProfileSchema', () => {
    it('accepts a valid Firestore document with Dates and id', () => {
      const now = new Date();
      const doc = {
        id: 'user-123',
        baseCurrency: 'USD',
        locale: 'en',
        theme: 'system',
        schemaVersion: 1,
        displayName: 'Alice',
        createdAt: now,
        updatedAt: now,
      };
      const parsed = userProfileSchema.parse(doc);
      expect(parsed.id).toBe('user-123');
      expect(parsed.createdAt).toBe(now);
      expect(parsed.updatedAt).toBe(now);
    });

    it('rejects missing id or empty id', () => {
      const doc = {
        id: '',
        baseCurrency: 'USD',
        locale: 'en',
        theme: 'system',
        schemaVersion: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(userProfileSchema.safeParse(doc).success).toBe(false);
    });
  });
});
