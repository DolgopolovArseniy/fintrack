import { describe, expect, it } from 'vitest';
import { DISPLAY_NAME_MAX_LENGTH } from '@/lib/limits';
import {
  PASSWORD_MIN_LENGTH,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from './formSchemas';

describe('formSchemas', () => {
  describe('loginSchema', () => {
    it('accepts valid credentials and trims email', () => {
      const result = loginSchema.safeParse({
        email: '  test@example.com  ',
        password: 'password123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
        expect(result.data.password).toBe('password123');
      }
    });

    it('rejects empty email and whitespace with validation.required', () => {
      const emptyResult = loginSchema.safeParse({
        email: '',
        password: 'valid-password',
      });
      expect(emptyResult.success).toBe(false);
      if (!emptyResult.success) {
        expect(emptyResult.error.issues[0]?.message).toBe(
          'validation.required',
        );
      }

      const whitespaceResult = loginSchema.safeParse({
        email: '   ',
        password: 'valid-password',
      });
      expect(whitespaceResult.success).toBe(false);
      if (!whitespaceResult.success) {
        expect(whitespaceResult.error.issues[0]?.message).toBe(
          'validation.required',
        );
      }
    });

    it('rejects invalid email with validation.emailInvalid', () => {
      const result = loginSchema.safeParse({
        email: 'invalid-email',
        password: 'valid-password',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.emailInvalid');
      }
    });

    it('rejects empty password with validation.required', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.required');
      }
    });
  });

  describe('registerSchema', () => {
    it('accepts valid input with optional displayName and trims input', () => {
      const result = registerSchema.safeParse({
        displayName: '  Alice Doe  ',
        email: ' alice@example.com ',
        password: 'secret-password-123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.displayName).toBe('Alice Doe');
        expect(result.data.email).toBe('alice@example.com');
        expect(result.data.password).toBe('secret-password-123');
      }
    });

    it('accepts empty or whitespace-only displayName', () => {
      const result = registerSchema.safeParse({
        displayName: '   ',
        email: 'alice@example.com',
        password: 'secret-password-123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.displayName?.trim()).toBe('');
      }
    });

    it('rejects displayName exceeding DISPLAY_NAME_MAX_LENGTH with validation.tooLong', () => {
      const result = registerSchema.safeParse({
        displayName: 'A'.repeat(DISPLAY_NAME_MAX_LENGTH + 1),
        email: 'alice@example.com',
        password: 'secret-password-123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.tooLong');
      }
    });

    it('rejects password shorter than PASSWORD_MIN_LENGTH with validation.passwordTooShort', () => {
      const result = registerSchema.safeParse({
        email: 'alice@example.com',
        password: 'short',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'validation.passwordTooShort',
        );
      }
    });

    it('rejects empty password with validation.required', () => {
      const result = registerSchema.safeParse({
        email: 'alice@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.required');
      }
    });

    it('accepts password with exactly PASSWORD_MIN_LENGTH characters', () => {
      const result = registerSchema.safeParse({
        email: 'alice@example.com',
        password: 'A'.repeat(PASSWORD_MIN_LENGTH),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('resetPasswordSchema', () => {
    it('accepts valid email', () => {
      const result = resetPasswordSchema.safeParse({
        email: 'test@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty email with validation.required', () => {
      const result = resetPasswordSchema.safeParse({
        email: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.required');
      }
    });

    it('rejects malformed email with validation.emailInvalid', () => {
      const result = resetPasswordSchema.safeParse({
        email: 'not-an-email',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('validation.emailInvalid');
      }
    });
  });
});
