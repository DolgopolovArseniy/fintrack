import { act, renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccounts, type Account } from '@/features/accounts';
import { useAuth } from '@/features/auth';
import { useCategories, type Category } from '@/features/categories';
import type { Transaction } from '@/features/transactions';
import { downloadCsvBlob } from '@/lib/csv';
import { useQuickExport } from './useQuickExport';

vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/features/categories', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/categories')>();
  return {
    ...actual,
    useCategories: vi.fn(),
  };
});

vi.mock('@/features/accounts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/accounts')>();
  return {
    ...actual,
    useAccounts: vi.fn(),
  };
});

vi.mock('@/lib/csv', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/csv')>();
  return {
    ...actual,
    downloadCsvBlob: vi.fn(),
  };
});

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

describe('useQuickExport', () => {
  const mockProfile = { baseCurrency: 'USD' };

  const mockCategories: Category[] = [
    {
      id: 'cat-1',
      name: 'Groceries',
      systemKey: undefined,
      icon: 'shopping-cart',
      color: 'emerald',
      type: 'expense',
      archived: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
  ];

  const mockAccounts: Account[] = [
    {
      id: 'acc-1',
      name: 'Main Card',
      systemKey: undefined,
      type: 'card',
      balance: 100000,
      initialBalance: 100000,
      archived: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
  ];

  const mockTransactions: Transaction[] = [
    {
      id: 'tx-1',
      date: '2026-10-15',
      type: 'expense',
      categoryId: 'cat-1',
      accountId: 'acc-1',
      amount: 2500,
      createdAt: new Date('2026-10-15'),
      updatedAt: new Date('2026-10-15'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-1' },
      profile: mockProfile,
    } as ReturnType<typeof useAuth>);

    vi.mocked(useCategories).mockReturnValue({
      status: 'success',
      data: mockCategories,
      retry: vi.fn(),
    });

    vi.mocked(useAccounts).mockReturnValue({
      status: 'success',
      data: mockAccounts,
      retry: vi.fn(),
    });
  });

  it('exports transactions and triggers download and success toast', () => {
    const { result } = renderHook(() => useQuickExport());

    act(() => {
      result.current.exportCurrentView(mockTransactions, '2026-10');
    });

    expect(downloadCsvBlob).toHaveBeenCalledTimes(1);
    expect(vi.mocked(downloadCsvBlob).mock.calls[0]?.[1]).toMatch(
      /^fintrack-export-2026-10-/,
    );
    expect(toast.success).toHaveBeenCalled();
  });

  it('shows informational toast and skips download when transaction list is empty', () => {
    const { result } = renderHook(() => useQuickExport());

    act(() => {
      result.current.exportCurrentView([], '2026-10');
    });

    expect(downloadCsvBlob).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalled();
  });

  it('catches download errors and shows error toast', () => {
    vi.mocked(downloadCsvBlob).mockImplementationOnce(() => {
      throw new Error('Blob creation failed');
    });

    const { result } = renderHook(() => useQuickExport());

    act(() => {
      result.current.exportCurrentView(mockTransactions, '2026-10');
    });

    expect(toast.error).toHaveBeenCalled();
  });
});
