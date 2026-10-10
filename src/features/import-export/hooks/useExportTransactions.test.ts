import { act, renderHook, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccounts, type Account } from '@/features/accounts';
import { useAuth } from '@/features/auth';
import { useCategories, type Category } from '@/features/categories';
import {
  getTransactionsByDateRange,
  type Transaction,
} from '@/features/transactions';
import { downloadCsvBlob } from '@/lib/csv';
import {
  getPresetFilenameScope,
  resolvePresetDateRange,
  useExportTransactions,
} from './useExportTransactions';

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

vi.mock('@/features/transactions', () => ({
  getTransactionsByDateRange: vi.fn(),
}));

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

describe('useExportTransactions', () => {
  const mockUser = { uid: 'test-user-123' };
  const mockProfile = { baseCurrency: 'USD' };

  const mockCategories: Category[] = [
    {
      id: 'cat-1',
      name: 'Food',
      systemKey: undefined,
      icon: 'utensils',
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
      name: 'Card',
      systemKey: undefined,
      type: 'card',
      balance: 100000,
      initialBalance: 100000,
      archived: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
  ];

  const mockTxs: Transaction[] = [
    {
      id: 'tx-1',
      date: '2026-10-05',
      type: 'expense',
      categoryId: 'cat-1',
      accountId: 'acc-1',
      amount: 1500,
      createdAt: new Date('2026-10-05'),
      updatedAt: new Date('2026-10-05'),
    },
    {
      id: 'tx-2',
      date: '2026-10-06',
      type: 'income',
      categoryId: 'cat-1',
      accountId: 'acc-1',
      amount: 50000,
      createdAt: new Date('2026-10-06'),
      updatedAt: new Date('2026-10-06'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
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

    vi.mocked(getTransactionsByDateRange).mockResolvedValue(mockTxs);
  });

  describe('resolvePresetDateRange', () => {
    it('resolves date ranges for all presets correctly', () => {
      const current = resolvePresetDateRange('currentMonth');
      expect(current.isValid).toBe(true);
      expect(current.start).toMatch(/^\d{4}-\d{2}-01$/);
      expect(current.end).toMatch(/^\d{4}-\d{2}-31$/);

      const prev = resolvePresetDateRange('prevMonth');
      expect(prev.isValid).toBe(true);

      const last3 = resolvePresetDateRange('last3Months');
      expect(last3.isValid).toBe(true);

      const last6 = resolvePresetDateRange('last6Months');
      expect(last6.isValid).toBe(true);

      const thisYr = resolvePresetDateRange('thisYear');
      expect(thisYr.isValid).toBe(true);
      expect(thisYr.start).toMatch(/^\d{4}-01-01$/);
      expect(thisYr.end).toMatch(/^\d{4}-12-31$/);

      const all = resolvePresetDateRange('allTime');
      expect(all.isValid).toBe(true);
      expect(all.start).toBe('1970-01-01');
      expect(all.end).toBe('2099-12-31');

      const customValid = resolvePresetDateRange(
        'custom',
        '2026-01-01',
        '2026-05-01',
      );
      expect(customValid.isValid).toBe(true);
      expect(customValid.start).toBe('2026-01-01');
      expect(customValid.end).toBe('2026-05-01');

      const customInvalid = resolvePresetDateRange(
        'custom',
        '2026-06-01',
        '2026-05-01',
      );
      expect(customInvalid.isValid).toBe(false);

      const customMissing = resolvePresetDateRange('custom');
      expect(customMissing.isValid).toBe(false);
    });
  });

  describe('getPresetFilenameScope', () => {
    it('returns formatted filename scopes', () => {
      expect(
        getPresetFilenameScope('currentMonth', '2026-10-01', '2026-10-31'),
      ).toBeDefined();
      expect(
        getPresetFilenameScope('last3Months', '2026-08-01', '2026-10-31'),
      ).toBe('last-3-months');
      expect(
        getPresetFilenameScope('last6Months', '2026-05-01', '2026-10-31'),
      ).toBe('last-6-months');
      expect(
        getPresetFilenameScope('allTime', '1970-01-01', '2099-12-31'),
      ).toBe('all-time');
      expect(getPresetFilenameScope('custom', '2026-01-01', '2026-06-30')).toBe(
        'custom-2026-01-01-2026-06-30',
      );
    });
  });

  describe('useExportTransactions hook behavior', () => {
    it('loads transactions on mount and updates matchingCount', async () => {
      const { result } = renderHook(() => useExportTransactions());

      await waitFor(() => {
        expect(result.current.matchingCount).toBe(2);
      });

      expect(getTransactionsByDateRange).toHaveBeenCalledTimes(1);
      expect(result.current.isLoadingCount).toBe(false);
    });

    it('filters matching count by transaction type, category, and account', async () => {
      const { result } = renderHook(() => useExportTransactions());

      await waitFor(() => {
        expect(result.current.matchingCount).toBe(2);
      });

      // Filter only expenses
      act(() => {
        result.current.setConfig({ type: 'expense' });
      });
      expect(result.current.matchingCount).toBe(1);

      // Filter only income
      act(() => {
        result.current.setConfig({ type: 'income' });
      });
      expect(result.current.matchingCount).toBe(1);

      // Filter non-matching category
      act(() => {
        result.current.setConfig({ categoryId: 'other-cat' });
      });
      expect(result.current.matchingCount).toBe(0);

      // Filter non-matching account
      act(() => {
        result.current.setConfig({ categoryId: 'all', accountId: 'other-acc' });
      });
      expect(result.current.matchingCount).toBe(0);
    });

    it('exports CSV successfully and triggers download and success notification', async () => {
      const { result } = renderHook(() => useExportTransactions());

      await waitFor(() => {
        expect(result.current.matchingCount).toBe(2);
      });

      act(() => {
        result.current.exportCsv();
      });

      expect(downloadCsvBlob).toHaveBeenCalledTimes(1);
      expect(vi.mocked(downloadCsvBlob).mock.calls[0]?.[1]).toMatch(
        /^fintrack-export-/,
      );
      expect(toast.success).toHaveBeenCalled();
    });

    it('handles empty matches by displaying toast without calling download', async () => {
      const { result } = renderHook(() => useExportTransactions());

      await waitFor(() => {
        expect(result.current.matchingCount).toBe(2);
      });

      act(() => {
        result.current.setConfig({ categoryId: 'none' });
      });

      act(() => {
        result.current.exportCsv();
      });

      expect(downloadCsvBlob).not.toHaveBeenCalled();
      expect(toast).toHaveBeenCalled();
    });

    it('handles fetch failure gracefully', async () => {
      vi.mocked(getTransactionsByDateRange).mockRejectedValueOnce(
        new Error('Network error'),
      );

      const { result } = renderHook(() => useExportTransactions());

      await waitFor(() => {
        expect(result.current.isLoadingCount).toBe(false);
      });

      expect(result.current.matchingCount).toBe(0);
      expect(toast.error).toHaveBeenCalled();
    });

    it('handles unauthenticated user state', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        profile: null,
      } as ReturnType<typeof useAuth>);

      const { result } = renderHook(() => useExportTransactions());

      expect(result.current.matchingCount).toBe(0);
      expect(result.current.isLoadingCount).toBe(false);
    });
  });
});
