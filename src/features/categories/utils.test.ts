import { describe, expect, it } from 'vitest';
import { getCategoryDisplayName, sortCategories } from './utils';

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

describe('sortCategories', () => {
  it('places active categories before archived categories', () => {
    const activeCat = {
      id: '1',
      type: 'expense' as const,
      name: 'Active',
      icon: 'zap',
      color: 'amber' as const,
      archived: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };
    const archivedCat = {
      id: '2',
      type: 'expense' as const,
      name: 'Archived',
      icon: 'zap',
      color: 'amber' as const,
      archived: true,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    };

    const sorted = sortCategories([archivedCat, activeCat]);
    expect(sorted.map((c) => c.name)).toEqual(['Active', 'Archived']);
  });

  it('places system categories before custom user categories', () => {
    const customCat = {
      id: 'custom-1',
      type: 'expense' as const,
      name: 'Gym',
      icon: 'dumbbell',
      color: 'slate' as const,
      archived: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };
    const systemCat = {
      id: 'sys-1',
      type: 'expense' as const,
      systemKey: 'food' as const,
      icon: 'utensils',
      color: 'orange' as const,
      archived: false,
      createdAt: new Date('2026-01-02'),
      updatedAt: new Date('2026-01-02'),
    };

    const sorted = sortCategories([customCat, systemCat]);
    expect(sorted[0]?.id).toBe('sys-1');
    expect(sorted[1]?.id).toBe('custom-1');
  });

  it('orders custom categories by createdAt ascending (newest at the end)', () => {
    const customFirst = {
      id: 'custom-1',
      type: 'expense' as const,
      name: 'Old Custom',
      icon: 'dumbbell',
      color: 'slate' as const,
      archived: false,
      createdAt: new Date('2026-01-01T10:00:00Z'),
      updatedAt: new Date('2026-01-01T10:00:00Z'),
    };
    const customSecond = {
      id: 'custom-2',
      type: 'expense' as const,
      name: 'New Custom',
      icon: 'book',
      color: 'emerald' as const,
      archived: false,
      createdAt: new Date('2026-01-01T12:00:00Z'),
      updatedAt: new Date('2026-01-01T12:00:00Z'),
    };

    const sorted = sortCategories([customSecond, customFirst]);
    expect(sorted.map((c) => c.name)).toEqual(['Old Custom', 'New Custom']);
  });

  it('maintains predefined order for system categories', () => {
    const food = {
      id: 'sys-food',
      type: 'expense' as const,
      systemKey: 'food' as const,
      icon: 'utensils',
      color: 'orange' as const,
      archived: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };
    const otherExpense = {
      id: 'sys-other',
      type: 'expense' as const,
      systemKey: 'other_expense' as const,
      icon: 'circle-ellipsis',
      color: 'slate' as const,
      archived: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };

    const sorted = sortCategories([otherExpense, food]);
    expect(sorted.map((c) => c.systemKey)).toEqual(['food', 'other_expense']);
  });
});
