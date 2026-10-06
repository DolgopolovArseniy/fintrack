import { describe, expect, it } from 'vitest';
import {
  getAccountDisplayName,
  getAccountIconName,
  getAccountTypeLabel,
  sortAccounts,
} from './utils';

describe('getAccountDisplayName', () => {
  it('returns custom name when name is provided', () => {
    const account = { name: 'My Custom Account' };
    expect(getAccountDisplayName(account)).toBe('My Custom Account');
  });

  it('prioritizes name over systemKey', () => {
    const account = {
      name: 'Salary Card',
      systemKey: 'main',
    };
    expect(getAccountDisplayName(account)).toBe('Salary Card');
  });

  it('translates systemKey when name is absent', () => {
    const account = { systemKey: 'main' };
    const mockT = (key: string) =>
      key === 'accounts.system.main' ? 'Main Account Translated' : key;

    expect(getAccountDisplayName(account, mockT)).toBe(
      'Main Account Translated',
    );
  });

  it('falls back to "Main account" if no translation function is passed and systemKey is "main"', () => {
    const account = { systemKey: 'main' };
    expect(getAccountDisplayName(account)).toBe('Main account');
  });

  it('falls back to systemKey if no translation function is passed and systemKey is not "main"', () => {
    const account = { systemKey: 'secondary' };
    expect(getAccountDisplayName(account)).toBe('secondary');
  });

  it('returns empty string if neither name nor systemKey is present', () => {
    const account = {};
    expect(getAccountDisplayName(account)).toBe('');
  });
});

describe('getAccountTypeLabel', () => {
  it('returns default English labels when translation function is not provided', () => {
    expect(getAccountTypeLabel('cash')).toBe('Cash');
    expect(getAccountTypeLabel('card')).toBe('Card');
    expect(getAccountTypeLabel('bank')).toBe('Bank account');
  });

  it('translates account types when translation function is provided', () => {
    const mockT = (key: string) => {
      const map: Record<string, string> = {
        'accounts.types.cash': 'Наличные',
        'accounts.types.card': 'Банковская карта',
        'accounts.types.bank': 'Банковский счёт',
      };
      return map[key] ?? key;
    };

    expect(getAccountTypeLabel('cash', mockT)).toBe('Наличные');
    expect(getAccountTypeLabel('card', mockT)).toBe('Банковская карта');
    expect(getAccountTypeLabel('bank', mockT)).toBe('Банковский счёт');
  });
});

describe('getAccountIconName', () => {
  it('returns banknote for cash', () => {
    expect(getAccountIconName('cash')).toBe('banknote');
  });

  it('returns credit-card for card', () => {
    expect(getAccountIconName('card')).toBe('credit-card');
  });

  it('returns landmark for bank', () => {
    expect(getAccountIconName('bank')).toBe('landmark');
  });
});

describe('sortAccounts', () => {
  it('places active accounts before archived accounts', () => {
    const activeAccount = {
      id: '1',
      type: 'card' as const,
      balance: 1000,
      initialBalance: 1000,
      name: 'Active Card',
      archived: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };
    const archivedAccount = {
      id: '2',
      type: 'card' as const,
      balance: 0,
      initialBalance: 0,
      name: 'Archived Card',
      archived: true,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    };

    const sorted = sortAccounts([archivedAccount, activeAccount]);
    expect(sorted.map((a) => a.name)).toEqual(['Active Card', 'Archived Card']);
  });

  it('places system accounts before custom user accounts', () => {
    const customAccount = {
      id: 'custom-1',
      type: 'card' as const,
      balance: 5000,
      initialBalance: 5000,
      name: 'T-Bank Card',
      archived: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };
    const systemAccount = {
      id: 'sys-1',
      type: 'cash' as const,
      balance: 0,
      initialBalance: 0,
      systemKey: 'main',
      archived: false,
      createdAt: new Date('2026-01-02'),
      updatedAt: new Date('2026-01-02'),
    };

    const sorted = sortAccounts([customAccount, systemAccount]);
    expect(sorted[0]?.id).toBe('sys-1');
    expect(sorted[1]?.id).toBe('custom-1');
  });

  it('orders custom accounts by createdAt ascending (oldest first)', () => {
    const customFirst = {
      id: 'custom-1',
      type: 'card' as const,
      balance: 100,
      initialBalance: 100,
      name: 'Old Account',
      archived: false,
      createdAt: new Date('2026-01-01T10:00:00Z'),
      updatedAt: new Date('2026-01-01T10:00:00Z'),
    };
    const customSecond = {
      id: 'custom-2',
      type: 'bank' as const,
      balance: 200,
      initialBalance: 200,
      name: 'New Account',
      archived: false,
      createdAt: new Date('2026-01-01T12:00:00Z'),
      updatedAt: new Date('2026-01-01T12:00:00Z'),
    };

    const sorted = sortAccounts([customSecond, customFirst]);
    expect(sorted.map((a) => a.name)).toEqual(['Old Account', 'New Account']);
  });

  it('falls back to alphabetical order when createdAt is identical', () => {
    const accountB = {
      id: 'acc-b',
      type: 'card' as const,
      balance: 100,
      initialBalance: 100,
      name: 'Beta Card',
      archived: false,
      createdAt: new Date('2026-01-01T10:00:00Z'),
      updatedAt: new Date('2026-01-01T10:00:00Z'),
    };
    const accountA = {
      id: 'acc-a',
      type: 'card' as const,
      balance: 200,
      initialBalance: 200,
      name: 'Alpha Card',
      archived: false,
      createdAt: new Date('2026-01-01T10:00:00Z'),
      updatedAt: new Date('2026-01-01T10:00:00Z'),
    };

    const sorted = sortAccounts([accountB, accountA]);
    expect(sorted.map((a) => a.name)).toEqual(['Alpha Card', 'Beta Card']);
  });
});
