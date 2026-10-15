import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccounts } from '@/features/accounts';
import { useAuth } from '@/features/auth';
import { useCategories } from '@/features/categories';
import { getTransactionsByDateRange } from '@/features/transactions';
import { buildAccount, buildCategory } from '@/test/factories';
import { useCsvImport } from './useCsvImport';

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

vi.mock('@/features/transactions', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/transactions')>();
  return {
    ...actual,
    getTransactionsByDateRange: vi.fn(() => Promise.resolve([])),
    createTransactionsBatch: vi.fn(),
    chunkImportInputs: vi.fn((inputs: unknown[]) => [inputs]),
  };
});

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

const csvFile = new File(
  [
    'Date,Type,Category,Account,Amount\n' +
      '2026-09-15,Expense,Groceries,Main Card,10\n' +
      '2026-09-15,Expense,Groceries,Main Card,10\n' +
      '2026-09-16,Expense,Groceries,Main Card,5\n',
  ],
  'sample.csv',
  { type: 'text/csv' },
);

describe('useCsvImport duplicate controls and navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-1' },
      profile: { baseCurrency: 'USD' },
    } as ReturnType<typeof useAuth>);
    vi.mocked(useCategories).mockReturnValue({
      status: 'success',
      data: [
        buildCategory({ id: 'cat-food', name: 'Groceries', type: 'expense' }),
      ],
      retry: vi.fn(),
    });
    vi.mocked(useAccounts).mockReturnValue({
      status: 'success',
      data: [buildAccount({ id: 'acc-card', name: 'Main Card' })],
      retry: vi.fn(),
    });
    vi.mocked(getTransactionsByDateRange).mockResolvedValue([]);
  });

  async function loadPreview() {
    const { result } = renderHook(() => useCsvImport());
    await act(async () => {
      await result.current.loadFile(csvFile);
    });
    expect(result.current.step).toBe('mapping');
    act(() => {
      expect(result.current.goToPreview()).toBe(true);
    });
    await waitFor(() => {
      expect(result.current.rows).toHaveLength(3);
    });
    return result;
  }

  it('re-excludes duplicates after manual re-inclusion', async () => {
    const result = await loadPreview();

    expect(
      result.current.rows.find((row) => row.rowNumber === 2),
    ).toMatchObject({ status: 'duplicate', excluded: true });

    act(() => {
      result.current.setRowExcluded(2, false);
    });
    expect(
      result.current.rows.find((row) => row.rowNumber === 2)?.excluded,
    ).toBe(false);

    act(() => {
      result.current.excludeAllByStatus('duplicate');
    });
    expect(
      result.current.rows.find((row) => row.rowNumber === 2)?.excluded,
    ).toBe(true);
  });

  it('returns to mapping without losing the file', async () => {
    const result = await loadPreview();

    act(() => {
      result.current.goToMapping();
    });

    expect(result.current.step).toBe('mapping');
    expect(result.current.table).not.toBeNull();
  });
});
