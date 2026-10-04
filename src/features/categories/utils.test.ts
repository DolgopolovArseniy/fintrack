import { describe, expect, it } from 'vitest';
import { getCategoryDisplayName } from './utils';

describe('getCategoryDisplayName', () => {
  it('returns custom name when name is provided', () => {
    const category = { name: 'My Custom Category' };
    expect(getCategoryDisplayName(category)).toBe('My Custom Category');
  });

  it('prioritizes name over systemKey', () => {
    const category = {
      name: 'Custom Food',
      systemKey: 'food',
    };
    expect(getCategoryDisplayName(category)).toBe('Custom Food');
  });

  it('translates systemKey when name is absent', () => {
    const category = { systemKey: 'food' };
    const mockT = (key: string) =>
      key === 'categories.system.food' ? 'Food & Groceries' : key;

    expect(getCategoryDisplayName(category, mockT)).toBe('Food & Groceries');
  });

  it('falls back to systemKey if no translation function is passed', () => {
    const category = { systemKey: 'transport' };
    expect(getCategoryDisplayName(category)).toBe('transport');
  });

  it('returns empty string if neither name nor systemKey is present', () => {
    const category = {};
    expect(getCategoryDisplayName(category)).toBe('');
  });
});
