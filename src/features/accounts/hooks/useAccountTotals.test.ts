import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Account } from '../schemas';
import { calculateAccountTotals, useAccountTotals } from './useAccountTotals';

describe('calculateAccountTotals & useAccountTotals', () => {
  const createMockAccount = (overrides: Partial<Account>): Account => ({
    id: 'acc-1',
    name: 'Test Account',
    type: 'cash',
    balance: 10000,
    initialBalance: 10000,
    archived: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  });

  it('calculates totals for empty accounts list', () => {
    const result = calculateAccountTotals([]);

    expect(result).toEqual({
      totalBalance: 0,
      cashBalance: 0,
      cardBalance: 0,
      bankBalance: 0,
      activeAccountsCount: 0,
      archivedAccountsCount: 0,
    });
  });

  it('calculates totals for multiple active accounts of different types', () => {
    const accounts: Account[] = [
      createMockAccount({ id: '1', type: 'cash', balance: 5000 }),
      createMockAccount({ id: '2', type: 'card', balance: 15000 }),
      createMockAccount({ id: '3', type: 'bank', balance: 30000 }),
      createMockAccount({ id: '4', type: 'card', balance: 2500 }),
    ];

    const result = calculateAccountTotals(accounts);

    expect(result).toEqual({
      totalBalance: 52500,
      cashBalance: 5000,
      cardBalance: 17500,
      bankBalance: 30000,
      activeAccountsCount: 4,
      archivedAccountsCount: 0,
    });
  });

  it('correctly isolates archived accounts from balances', () => {
    const accounts: Account[] = [
      createMockAccount({
        id: '1',
        type: 'cash',
        balance: 5000,
        archived: false,
      }),
      createMockAccount({
        id: '2',
        type: 'card',
        balance: 20000,
        archived: true,
      }),
      createMockAccount({
        id: '3',
        type: 'bank',
        balance: 10000,
        archived: false,
      }),
      createMockAccount({
        id: '4',
        type: 'cash',
        balance: 7000,
        archived: true,
      }),
    ];

    const result = calculateAccountTotals(accounts);

    expect(result).toEqual({
      totalBalance: 15000,
      cashBalance: 5000,
      cardBalance: 0,
      bankBalance: 10000,
      activeAccountsCount: 2,
      archivedAccountsCount: 2,
    });
  });

  it('handles negative balances correctly (overdraft / credit cards)', () => {
    const accounts: Account[] = [
      createMockAccount({ id: '1', type: 'cash', balance: 10000 }),
      createMockAccount({ id: '2', type: 'card', balance: -4500 }),
      createMockAccount({ id: '3', type: 'bank', balance: -2000 }),
    ];

    const result = calculateAccountTotals(accounts);

    expect(result).toEqual({
      totalBalance: 3500,
      cashBalance: 10000,
      cardBalance: -4500,
      bankBalance: -2000,
      activeAccountsCount: 3,
      archivedAccountsCount: 0,
    });
  });

  it('memoizes calculation result with useAccountTotals hook', () => {
    const accounts: Account[] = [
      createMockAccount({ id: '1', type: 'cash', balance: 1000 }),
    ];

    const { result, rerender } = renderHook(
      ({ list }) => useAccountTotals(list),
      { initialProps: { list: accounts } },
    );

    const firstResult = result.current;
    expect(firstResult.totalBalance).toBe(1000);

    // Re-render with same reference
    rerender({ list: accounts });
    expect(result.current).toBe(firstResult);

    // Re-render with new reference
    const updatedAccounts: Account[] = [
      createMockAccount({ id: '1', type: 'cash', balance: 2500 }),
    ];
    rerender({ list: updatedAccounts });

    expect(result.current).not.toBe(firstResult);
    expect(result.current.totalBalance).toBe(2500);
  });
});
