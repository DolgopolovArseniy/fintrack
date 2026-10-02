import { describe, expect, it } from 'vitest';
import i18n from '@/i18n/config';
import { isValidationKey, translateValidationMessage } from './validation';

describe('translateValidationMessage', () => {
  const t = i18n.t.bind(i18n);

  it('correctly identifies valid validation keys', () => {
    expect(isValidationKey('validation.required')).toBe(true);
    expect(isValidationKey('validation.emailInvalid')).toBe(true);
    expect(isValidationKey('validation.passwordTooShort')).toBe(true);
    expect(isValidationKey('validation.tooLong')).toBe(true);
    expect(isValidationKey('unknown.key')).toBe(false);
  });

  it('returns empty string for non-string or whitespace messages', () => {
    expect(translateValidationMessage(t, undefined)).toBe('');
    expect(translateValidationMessage(t, null)).toBe('');
    expect(translateValidationMessage(t, '')).toBe('');
    expect(translateValidationMessage(t, '   ')).toBe('');
    expect(translateValidationMessage(t, 123)).toBe('');
  });

  it('translates standard validation keys with default fallback params', () => {
    expect(translateValidationMessage(t, 'validation.required')).toBe(
      'This field is required',
    );
    expect(translateValidationMessage(t, 'validation.emailInvalid')).toBe(
      'Enter a valid email address',
    );
    expect(translateValidationMessage(t, 'validation.passwordTooShort')).toBe(
      'Password must be at least 8 characters long',
    );
    expect(translateValidationMessage(t, 'validation.tooLong')).toBe(
      'Maximum 60 characters',
    );
  });

  it('handles parameterized key:count syntax', () => {
    expect(
      translateValidationMessage(t, 'validation.passwordTooShort:12'),
    ).toBe('Password must be at least 12 characters long');
    expect(translateValidationMessage(t, 'validation.tooLong:40')).toBe(
      'Maximum 40 characters',
    );
  });

  it('handles JSON serialized options', () => {
    const jsonMessage = JSON.stringify({
      key: 'validation.tooLong',
      count: 25,
    });
    expect(translateValidationMessage(t, jsonMessage)).toBe(
      'Maximum 25 characters',
    );
  });

  it('falls back to returning literal text if message is not a recognized key', () => {
    expect(translateValidationMessage(t, 'Custom manual error')).toBe(
      'Custom manual error',
    );
  });
});
