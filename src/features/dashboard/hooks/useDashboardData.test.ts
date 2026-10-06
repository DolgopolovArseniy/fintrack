import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccounts, type Account } from '@/features/accounts';
import { useAuth } from '@/features/auth';
import {
  subscribeTransactionsByDateRange,
  type Transaction,
} from '@/features/transactions';
import { useDashboardData } from './useDashboardData';

vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/features/accounts', () => ({
  useAccounts: vi.fn(),
}));

vi.mock('@/features/transactions', () => ({
  subscribeTransactionsByDateRange: vi.fn(),
}));

describe('useDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAccounts: Account[] = [
    {
      id: 'acc-1',
      name: 'Bank',
      type: 'bank',
      balance: 100000,
      initialBalance: 0,
      archived: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
  ];

  it('aggregates transactions and accounts into complete DashboardData', () => {
    let capturedOnData: (data: Transaction[]) => void = () => {};

    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-123' },
    } as ReturnType<typeof useAuth>);

    vi.mocked(useAccounts).mockReturnValue({
      status: 'success',
      data: mockAccounts,
      retry: vi.fn(),
    });

    vi.mocked(subscribeTransactionsByDateRange).mockImplementation(
      (_uid, _start, _end, onData) => {
        capturedOnData = onData;
        return vi.fn();
      },
    );

    const { result } = renderHook(() => useDashboardData('2026-10'));

    expect(subscribeTransactionsByDateRange).toHaveBeenCalledWith(
      'user-123',
      '2026-05-01',
      '2026-10-31',
      expect.any(Function),
      expect.any(Function),
    );

    const mockTxs: Transaction[] = [
      {
        id: 'tx-1',
        type: 'income',
        amount: 50000,
        accountId: 'acc-1',
        categoryId: 'cat-income',
        date: '2026-10-15',
        createdAt: new Date('2026-10-15T10:00:00Z'),
        updatedAt: new Date('2026-10-15T10:00:00Z'),
      },
      {
        id: 'tx-2',
        type: 'expense',
        amount: 20000,
        accountId: 'acc-1',
        categoryId: 'cat-food',
        date: '2026-10-10',
        createdAt: new Date('2026-10-10T10:00:00Z'),
        updatedAt: new Date('2026-10-10T10:00:00Z'),
      },
      {
        id: 'tx-prev',
        type: 'expense',
        amount: 25000,
        accountId: 'acc-1',
        categoryId: 'cat-food',
        date: '2026-09-20',
        createdAt: new Date('2026-09-20T10:00:00Z'),
        updatedAt: new Date('2026-09-20T10:00:00Z'),
      },
    ];

    act(() => {
      capturedOnData(mockTxs);
    });

    expect(result.current.status).toBe('success');
    if (result.current.status === 'success') {
      const data = result.current.data;
      expect(data.metrics.totalBalance).toBe(100000);
      expect(data.metrics.currentIncome).toBe(50000);
      expect(data.metrics.currentExpense).toBe(20000);
      expect(data.metrics.netSavings).toBe(30000);

      // Category expenses
      expect(data.categoryExpenses).toHaveLength(1);
      expect(data.categoryExpenses[0]?.categoryId).toBe('cat-food');
      expect(data.categoryExpenses[0]?.total).toBe(20000);
      expect(data.categoryExpenses[0]?.percentage).toBe(100);

      // Monthly history has 6 months
      expect(data.monthlyHistory).toHaveLength(6);
      expect(data.monthlyHistory[5]?.month).toBe('2026-10');
      expect(data.monthlyHistory[5]?.income).toBe(50000);
      expect(data.monthlyHistory[5]?.expense).toBe(20000);

      // Recent transactions of selected month
      expect(data.recentTransactions).toHaveLength(2);
      expect(data.recentTransactions[0]?.id).toBe('tx-1');
    }
  });

  it('reflects loading state when accounts are loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-123' },
    } as ReturnType<typeof useAuth>);

    vi.mocked(useAccounts).mockReturnValue({
      status: 'loading',
      retry: vi.fn(),
    });

    vi.mocked(subscribeTransactionsByDateRange).mockReturnValue(vi.fn());

    const { result } = renderHook(() => useDashboardData('2026-10'));

    expect(result.current.status).toBe('loading');
  });
});
