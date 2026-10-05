import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Transaction } from '../schemas';
import type { TransactionFilterState } from './useTransactionFilters';
import { useGroupedTransactions } from './useGroupedTransactions';

function createMockTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'tx-1',
    type: 'expense',
    amount: 1000,
    accountId: 'acc-1',
    categoryId: 'cat-1',
    date: '2026-10-15',
    createdAt: new Date('2026-10-15T10:00:00Z'),
    updatedAt: new Date('2026-10-15T10:00:00Z'),
    ...overrides,
  };
}

const defaultFilters: TransactionFilterState = {
  month: '2026-10',
  type: 'all',
  categoryId: 'all',
  accountId: 'all',
  search: '',
};

describe('useGroupedTransactions', () => {
  it('returns empty result when given empty transactions', () => {
    const { result } = renderHook(() =>
      useGroupedTransactions([], defaultFilters),
    );

    expect(result.current.groups).toEqual([]);
    expect(result.current.totalIncome).toBe(0);
    expect(result.current.totalExpense).toBe(0);
    expect(result.current.net).toBe(0);
    expect(result.current.filteredCount).toBe(0);
  });

  it('groups transactions by date descending and calculates day totals', () => {
    const transactions: Transaction[] = [
      createMockTransaction({
        id: 'tx-1',
        date: '2026-10-10',
        type: 'expense',
        amount: 500,
        createdAt: new Date('2026-10-10T08:00:00Z'),
      }),
      createMockTransaction({
        id: 'tx-2',
        date: '2026-10-15',
        type: 'income',
        amount: 5000,
        createdAt: new Date('2026-10-15T12:00:00Z'),
      }),
      createMockTransaction({
        id: 'tx-3',
        date: '2026-10-15',
        type: 'expense',
        amount: 1500,
        createdAt: new Date('2026-10-15T14:00:00Z'),
      }),
    ];

    const { result } = renderHook(() =>
      useGroupedTransactions(transactions, defaultFilters),
    );

    expect(result.current.groups).toHaveLength(2);
    expect(result.current.filteredCount).toBe(3);

    // Group 1: 2026-10-15 (newer date first)
    const day15 = result.current.groups[0];
    expect(day15?.date).toBe('2026-10-15');
    expect(day15?.totalIncome).toBe(5000);
    expect(day15?.totalExpense).toBe(1500);
    expect(day15?.net).toBe(3500);
    expect(day15?.transactions.map((t) => t.id)).toEqual(['tx-3', 'tx-2']); // tx-3 newer createdAt

    // Group 2: 2026-10-10
    const day10 = result.current.groups[1];
    expect(day10?.date).toBe('2026-10-10');
    expect(day10?.totalIncome).toBe(0);
    expect(day10?.totalExpense).toBe(500);
    expect(day10?.net).toBe(-500);
    expect(day10?.transactions.map((t) => t.id)).toEqual(['tx-1']);

    // Overall totals
    expect(result.current.totalIncome).toBe(5000);
    expect(result.current.totalExpense).toBe(2000);
    expect(result.current.net).toBe(3000);
  });

  it('filters transactions by type', () => {
    const transactions: Transaction[] = [
      createMockTransaction({ id: 'tx-1', type: 'expense', amount: 300 }),
      createMockTransaction({ id: 'tx-2', type: 'income', amount: 1000 }),
    ];

    const { result: expenseResult } = renderHook(() =>
      useGroupedTransactions(transactions, {
        ...defaultFilters,
        type: 'expense',
      }),
    );

    expect(expenseResult.current.filteredCount).toBe(1);
    expect(expenseResult.current.totalExpense).toBe(300);
    expect(expenseResult.current.totalIncome).toBe(0);
    expect(expenseResult.current.groups[0]?.transactions[0]?.id).toBe('tx-1');

    const { result: incomeResult } = renderHook(() =>
      useGroupedTransactions(transactions, {
        ...defaultFilters,
        type: 'income',
      }),
    );

    expect(incomeResult.current.filteredCount).toBe(1);
    expect(incomeResult.current.totalIncome).toBe(1000);
    expect(incomeResult.current.totalExpense).toBe(0);
    expect(incomeResult.current.groups[0]?.transactions[0]?.id).toBe('tx-2');
  });

  it('filters transactions by categoryId and accountId', () => {
    const transactions: Transaction[] = [
      createMockTransaction({
        id: 'tx-1',
        categoryId: 'cat-groceries',
        accountId: 'acc-card',
      }),
      createMockTransaction({
        id: 'tx-2',
        categoryId: 'cat-transport',
        accountId: 'acc-card',
      }),
      createMockTransaction({
        id: 'tx-3',
        categoryId: 'cat-groceries',
        accountId: 'acc-cash',
      }),
    ];

    const { result: catResult } = renderHook(() =>
      useGroupedTransactions(transactions, {
        ...defaultFilters,
        categoryId: 'cat-groceries',
      }),
    );
    expect(catResult.current.filteredCount).toBe(2);
    expect(
      catResult.current.groups.flatMap((g) => g.transactions).map((t) => t.id),
    ).toEqual(['tx-1', 'tx-3']);

    const { result: accResult } = renderHook(() =>
      useGroupedTransactions(transactions, {
        ...defaultFilters,
        accountId: 'acc-cash',
      }),
    );
    expect(accResult.current.filteredCount).toBe(1);
    expect(accResult.current.groups[0]?.transactions[0]?.id).toBe('tx-3');
  });

  it('filters transactions by note search (case-insensitive substring)', () => {
    const transactions: Transaction[] = [
      createMockTransaction({ id: 'tx-1', note: 'Weekly Groceries at Lidl' }),
      createMockTransaction({ id: 'tx-2', note: 'Coffee with Alice' }),
      createMockTransaction({ id: 'tx-3', note: undefined }),
    ];

    const { result } = renderHook(() =>
      useGroupedTransactions(transactions, {
        ...defaultFilters,
        search: '  LIDL ',
      }),
    );

    expect(result.current.filteredCount).toBe(1);
    expect(result.current.groups[0]?.transactions[0]?.id).toBe('tx-1');
  });

  it('combines multiple active filters', () => {
    const transactions: Transaction[] = [
      createMockTransaction({
        id: 'tx-1',
        type: 'expense',
        categoryId: 'cat-food',
        accountId: 'acc-1',
        note: 'Supermarket lunch',
      }),
      createMockTransaction({
        id: 'tx-2',
        type: 'income',
        categoryId: 'cat-food',
        accountId: 'acc-1',
        note: 'Supermarket refund',
      }),
      createMockTransaction({
        id: 'tx-3',
        type: 'expense',
        categoryId: 'cat-food',
        accountId: 'acc-2',
        note: 'Supermarket dinner',
      }),
    ];

    const { result } = renderHook(() =>
      useGroupedTransactions(transactions, {
        month: '2026-10',
        type: 'expense',
        categoryId: 'cat-food',
        accountId: 'acc-1',
        search: 'supermarket',
      }),
    );

    expect(result.current.filteredCount).toBe(1);
    expect(result.current.groups[0]?.transactions[0]?.id).toBe('tx-1');
  });
});
