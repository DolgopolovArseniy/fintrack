import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCategories, type Category } from '@/features/categories';
import { useTransactions, type Transaction } from '@/features/transactions';
import { AppError } from '@/lib/errors';
import type { Budget } from '../schemas';
import { useBudgets } from './useBudgets';
import { useBudgetSummary } from './useBudgetSummary';

vi.mock('@/features/categories', () => ({
  useCategories: vi.fn(),
}));

vi.mock('@/features/transactions', () => ({
  useTransactions: vi.fn(),
}));

vi.mock('./useBudgets', () => ({
  useBudgets: vi.fn(),
}));

describe('useBudgetSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCategories: Category[] = [
    {
      id: 'cat-food',
      type: 'expense',
      name: 'Food',
      icon: 'utensils',
      color: 'orange',
      archived: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    {
      id: 'cat-transport',
      type: 'expense',
      name: 'Transport',
      icon: 'car',
      color: 'sky',
      archived: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    {
      id: 'cat-ent',
      type: 'expense',
      name: 'Entertainment',
      icon: 'film',
      color: 'violet',
      archived: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    {
      id: 'cat-salary',
      type: 'income',
      name: 'Salary',
      icon: 'banknote',
      color: 'emerald',
      archived: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
  ];

  const mockBudgets: Budget[] = [
    {
      id: '2026-10_cat-food',
      categoryId: 'cat-food',
      month: '2026-10',
      limit: 1000000, // 10,000.00
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    },
    {
      id: '2026-10_cat-transport',
      categoryId: 'cat-transport',
      month: '2026-10',
      limit: 500000, // 5,000.00
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    },
  ];

  const mockPrevBudgets: Budget[] = [
    {
      id: '2026-09_cat-food',
      categoryId: 'cat-food',
      month: '2026-09',
      limit: 900000,
      createdAt: new Date('2026-09-01'),
      updatedAt: new Date('2026-09-01'),
    },
    {
      id: '2026-09_cat-transport',
      categoryId: 'cat-transport',
      month: '2026-09',
      limit: 500000,
      createdAt: new Date('2026-09-01'),
      updatedAt: new Date('2026-09-01'),
    },
    {
      id: '2026-09_cat-ent',
      categoryId: 'cat-ent',
      month: '2026-09',
      limit: 300000,
      createdAt: new Date('2026-09-01'),
      updatedAt: new Date('2026-09-01'),
    },
  ];

  const mockTransactions: Transaction[] = [
    {
      id: 'tx-1',
      type: 'expense',
      amount: 400000, // 4,000.00
      categoryId: 'cat-food',
      accountId: 'acc-1',
      date: '2026-10-05',
      note: 'Groceries',
      createdAt: new Date('2026-10-05'),
      updatedAt: new Date('2026-10-05'),
    },
    {
      id: 'tx-2',
      type: 'expense',
      amount: 550000, // 5,500.00 (exceeded)
      categoryId: 'cat-transport',
      accountId: 'acc-1',
      date: '2026-10-10',
      note: 'Fuel',
      createdAt: new Date('2026-10-10'),
      updatedAt: new Date('2026-10-10'),
    },
    {
      id: 'tx-3',
      type: 'income',
      amount: 5000000, // Salary (should not affect expense aggregation)
      categoryId: 'cat-salary',
      accountId: 'acc-1',
      date: '2026-10-01',
      note: 'Monthly salary',
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
    },
  ];

  it('aggregates budgets, transactions, and categories correctly', () => {
    vi.mocked(useBudgets).mockImplementation((month) => {
      if (month === '2026-10') {
        return {
          status: 'success',
          data: mockBudgets,
          retry: vi.fn(),
        } as unknown as ReturnType<typeof useBudgets>;
      }
      if (month === '2026-09') {
        return {
          status: 'success',
          data: mockPrevBudgets,
          retry: vi.fn(),
        } as unknown as ReturnType<typeof useBudgets>;
      }
      return {
        status: 'success',
        data: [],
        retry: vi.fn(),
      } as unknown as ReturnType<typeof useBudgets>;
    });

    vi.mocked(useCategories).mockReturnValue({
      status: 'success',
      data: mockCategories,
      retry: vi.fn(),
    } as unknown as ReturnType<typeof useCategories>);

    vi.mocked(useTransactions).mockReturnValue({
      status: 'success',
      data: mockTransactions,
      retry: vi.fn(),
    } as unknown as ReturnType<typeof useTransactions>);

    const { result } = renderHook(() => useBudgetSummary('2026-10'));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.previousMonthBudgetsCount).toBe(3);

    // Check enriched budgets
    expect(result.current.enrichedBudgets).toHaveLength(2);

    const food = result.current.enrichedBudgets.find(
      (b) => b.categoryId === 'cat-food',
    )!;
    expect(food).toBeDefined();
    expect(food.spent).toBe(400000);
    expect(food.limit).toBe(1000000);
    expect(food.remaining).toBe(600000);
    expect(food.overspent).toBe(0);
    expect(food.progress).toBe(40);
    expect(food.status).toBe('normal');

    const transport = result.current.enrichedBudgets.find(
      (b) => b.categoryId === 'cat-transport',
    )!;
    expect(transport).toBeDefined();
    expect(transport.spent).toBe(550000);
    expect(transport.limit).toBe(500000);
    expect(transport.remaining).toBe(0);
    expect(transport.overspent).toBe(50000);
    expect(transport.progress).toBe(110);
    expect(transport.status).toBe('exceeded');

    // Check summary totals
    expect(result.current.summaryTotals).toEqual({
      totalLimit: 1500000,
      totalSpent: 950000,
      totalRemaining: 550000,
      totalOverspent: 0,
      overallProgress: 63,
      overallStatus: 'normal',
      budgetCount: 2,
      normalCount: 1,
      warningCount: 0,
      exceededCount: 1,
    });

    // Check unbudgeted categories
    expect(result.current.unbudgetedCategories).toHaveLength(1);
    expect(result.current.unbudgetedCategories[0]?.id).toBe('cat-ent');
  });

  it('indicates loading state when any subscription is loading', () => {
    vi.mocked(useBudgets).mockReturnValue({
      status: 'loading',
      retry: vi.fn(),
    } as unknown as ReturnType<typeof useBudgets>);

    vi.mocked(useCategories).mockReturnValue({
      status: 'success',
      data: mockCategories,
      retry: vi.fn(),
    } as unknown as ReturnType<typeof useCategories>);

    vi.mocked(useTransactions).mockReturnValue({
      status: 'success',
      data: [],
      retry: vi.fn(),
    } as unknown as ReturnType<typeof useTransactions>);

    const { result } = renderHook(() => useBudgetSummary('2026-10'));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.enrichedBudgets).toEqual([]);
    expect(result.current.summaryTotals.budgetCount).toBe(0);
  });

  it('captures subscription error when a sub fails', () => {
    const appError = new AppError('offline', 'Network error');

    vi.mocked(useBudgets).mockReturnValue({
      status: 'error',
      error: appError,
      retry: vi.fn(),
    } as unknown as ReturnType<typeof useBudgets>);

    vi.mocked(useCategories).mockReturnValue({
      status: 'success',
      data: mockCategories,
      retry: vi.fn(),
    } as unknown as ReturnType<typeof useCategories>);

    vi.mocked(useTransactions).mockReturnValue({
      status: 'success',
      data: [],
      retry: vi.fn(),
    } as unknown as ReturnType<typeof useTransactions>);

    const { result } = renderHook(() => useBudgetSummary('2026-10'));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(appError);
  });
});
