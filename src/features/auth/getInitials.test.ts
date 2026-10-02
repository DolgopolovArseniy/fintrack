import { describe, it, expect } from 'vitest';
import { getInitials } from './getInitials';

describe('getInitials', () => {
  it('extracts two initials from first and last name', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('extracts single initial for single name', () => {
    expect(getInitials('John')).toBe('J');
  });

  it('extracts first and last initial for multi-word names', () => {
    expect(getInitials('John Robert Doe')).toBe('JD');
  });

  it('handles irregular whitespace and trims properly', () => {
    expect(getInitials('   alex    smith   ')).toBe('AS');
  });

  it('handles Cyrillic names', () => {
    expect(getInitials('Алексей Иванов')).toBe('АИ');
    expect(getInitials('Мария')).toBe('М');
  });

  it('falls back to email initial when displayName is missing or empty', () => {
    expect(getInitials(null, 'test@example.com')).toBe('T');
    expect(getInitials('', 'john@doe.com')).toBe('J');
    expect(getInitials('   ', 'user@domain.com')).toBe('U');
  });

  it('supports passing an object with displayName and email', () => {
    expect(
      getInitials({ displayName: 'Sarah Connor', email: 'sarah@skynet.com' }),
    ).toBe('SC');
    expect(
      getInitials({ displayName: null, email: 'terminator@future.com' }),
    ).toBe('T');
  });

  it('returns "?" when both name and email are empty or missing', () => {
    expect(getInitials(null, null)).toBe('?');
    expect(getInitials('', '')).toBe('?');
    expect(getInitials()).toBe('?');
    expect(getInitials({ displayName: null, email: null })).toBe('?');
  });
});
