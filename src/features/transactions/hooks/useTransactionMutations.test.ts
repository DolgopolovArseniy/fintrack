import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/features/auth';
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  restoreTransaction,
} from '../repository';
import type { Transaction } from '../schemas';
import { useTransactionMutations } from './useTransactionMutations';

vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(),
}));

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  duration?: number;
  action?: ToastAction;
}

const mockToast = vi.fn<(msg: string, opts?: ToastOptions) => void>();
const mockToastSuccess = vi.fn<(msg: string) => void>();
const mockToastError = vi.fn<(msg: string) => void>();

vi.mock('sonner', () => ({
  toast: Object.assign(
    (msg: string, opts?: ToastOptions) => mockToast(msg, opts),
    {
      success: (msg: string) => mockToastSuccess(msg),
      error: (msg: string) => mockToastError(msg),
    },
  ),
}));

vi.mock('../repository', () => ({
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  restoreTransaction: vi.fn(),
}));

describe('useTransactionMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-123' },
    } as ReturnType<typeof useAuth>);
  });

  const mockTx: Transaction = {
    id: 'tx-1',
    type: 'expense',
    amount: 1500,
    accountId: 'acc-1',
    categoryId: 'cat-1',
    date: '2026-10-12',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('calls createTransaction and displays success toast', async () => {
    vi.mocked(createTransaction).mockResolvedValue('new-tx-id');

    const { result } = renderHook(() => useTransactionMutations());

    let id = '';
    await act(async () => {
      id = await result.current.create({
        type: 'expense',
        amount: 1500,
        accountId: 'acc-1',
        categoryId: 'cat-1',
        date: '2026-10-12',
      });
    });

    expect(createTransaction).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({
        amount: 1500,
      }),
    );
    expect(mockToastSuccess).toHaveBeenCalledWith('Transaction added');
    expect(id).toBe('new-tx-id');
  });

  it('calls updateTransaction and displays success toast', async () => {
    vi.mocked(updateTransaction).mockResolvedValue(undefined);

    const { result } = renderHook(() => useTransactionMutations());

    await act(async () => {
      await result.current.update('tx-1', mockTx, { amount: 2000 });
    });

    expect(updateTransaction).toHaveBeenCalledWith('user-123', 'tx-1', mockTx, {
      amount: 2000,
    });
    expect(mockToastSuccess).toHaveBeenCalledWith('Transaction updated');
  });

  it('calls deleteTransaction and displays toast with Undo action', async () => {
    vi.mocked(deleteTransaction).mockResolvedValue(undefined);
    vi.mocked(restoreTransaction).mockResolvedValue(undefined);

    const { result } = renderHook(() => useTransactionMutations());

    await act(async () => {
      await result.current.remove(mockTx);
    });

    expect(deleteTransaction).toHaveBeenCalledWith('user-123', mockTx);
    expect(mockToast).toHaveBeenCalledWith(
      'Transaction deleted',
      expect.objectContaining({
        duration: 6000,
      }),
    );

    const firstCall = mockToast.mock.calls[0];
    expect(firstCall).toBeDefined();
    expect(firstCall?.[1]?.action?.label).toBe('Undo');

    // Test Undo action callback
    act(() => {
      firstCall?.[1]?.action?.onClick();
    });

    await vi.waitFor(() => {
      expect(restoreTransaction).toHaveBeenCalledWith('user-123', mockTx);
      expect(mockToastSuccess).toHaveBeenCalledWith('Transaction restored');
    });
  });

  it('handles error in deleteTransaction', async () => {
    vi.mocked(deleteTransaction).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTransactionMutations());

    await act(async () => {
      await expect(result.current.remove(mockTx)).rejects.toThrow();
    });

    expect(mockToastError).toHaveBeenCalledWith('Failed to delete transaction');
  });
});
