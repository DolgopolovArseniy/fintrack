import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth';
import {
  createAccount,
  updateAccount,
  archiveAccount,
  unarchiveAccount,
  recalculateAccountBalance,
} from '../repository';
import type { Account } from '../schemas';
import { useAccountMutations } from './useAccountMutations';

vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../repository', () => ({
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  archiveAccount: vi.fn(),
  unarchiveAccount: vi.fn(),
  recalculateAccountBalance: vi.fn(),
}));

describe('useAccountMutations', () => {
  const mockAccount: Account = {
    id: 'acc-1',
    name: 'Main Card',
    type: 'card',
    balance: 10000,
    initialBalance: 10000,
    archived: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-123' },
      profile: { baseCurrency: 'USD', locale: 'en' },
    } as unknown as ReturnType<typeof useAuth>);
  });

  it('calls createAccount and displays success toast', async () => {
    vi.mocked(createAccount).mockResolvedValue('new-acc-id');

    const { result } = renderHook(() => useAccountMutations());

    let id = '';
    await act(async () => {
      id = await result.current.createAccount({
        name: 'Cash Wallet',
        type: 'cash',
        initialBalance: 5000,
        archived: false,
      });
    });

    expect(createAccount).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({
        name: 'Cash Wallet',
        type: 'cash',
        initialBalance: 5000,
      }),
    );
    expect(toast.success).toHaveBeenCalledWith('Account created successfully');
    expect(id).toBe('new-acc-id');
    expect(result.current.isSubmitting).toBe(false);
  });

  it('calls updateAccount and displays success toast', async () => {
    vi.mocked(updateAccount).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAccountMutations());

    await act(async () => {
      await result.current.updateAccount('acc-1', mockAccount, {
        name: 'Updated Card',
        initialBalance: 15000,
      });
    });

    expect(updateAccount).toHaveBeenCalledWith(
      'user-123',
      'acc-1',
      mockAccount,
      {
        name: 'Updated Card',
        initialBalance: 15000,
      },
    );
    expect(toast.success).toHaveBeenCalledWith('Account updated successfully');
  });

  it('calls archiveAccount and displays success toast', async () => {
    vi.mocked(archiveAccount).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAccountMutations());

    await act(async () => {
      await result.current.archiveAccount('acc-1');
    });

    expect(archiveAccount).toHaveBeenCalledWith('user-123', 'acc-1');
    expect(toast.success).toHaveBeenCalledWith('Account archived');
  });

  it('calls unarchiveAccount and displays success toast', async () => {
    vi.mocked(unarchiveAccount).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAccountMutations());

    await act(async () => {
      await result.current.unarchiveAccount('acc-1');
    });

    expect(unarchiveAccount).toHaveBeenCalledWith('user-123', 'acc-1');
    expect(toast.success).toHaveBeenCalledWith('Account restored');
  });

  it('handles recalculateBalance when delta is 0', async () => {
    vi.mocked(recalculateAccountBalance).mockResolvedValue({
      previousBalance: 10000,
      newBalance: 10000,
      delta: 0,
      transactionCount: 5,
    });

    const { result } = renderHook(() => useAccountMutations());

    let res: unknown;
    await act(async () => {
      res = await result.current.recalculateBalance('acc-1');
    });

    expect(recalculateAccountBalance).toHaveBeenCalledWith('user-123', 'acc-1');
    expect(toast.success).toHaveBeenCalledWith(
      'Balance is accurate (5 transactions processed)',
    );
    expect(res).toEqual({
      previousBalance: 10000,
      newBalance: 10000,
      delta: 0,
      transactionCount: 5,
    });
    expect(result.current.isRecalculating).toBe(false);
  });

  it('handles recalculateBalance when delta is non-zero (adjusted)', async () => {
    vi.mocked(recalculateAccountBalance).mockResolvedValue({
      previousBalance: 10000,
      newBalance: 15000,
      delta: 5000,
      transactionCount: 8,
    });

    const { result } = renderHook(() => useAccountMutations());

    await act(async () => {
      await result.current.recalculateBalance('acc-1');
    });

    expect(recalculateAccountBalance).toHaveBeenCalledWith('user-123', 'acc-1');
    expect(toast.success).toHaveBeenCalledWith(
      'Balance adjusted: from $100.00 to $150.00 (8 transactions processed)',
    );
  });

  it('throws unauthorized error when user is not signed in', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      profile: null,
    } as unknown as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useAccountMutations());

    await expect(
      result.current.createAccount({
        name: 'Unauthorized',
        type: 'cash',
        initialBalance: 0,
        archived: false,
      }),
    ).rejects.toThrow('You must be signed in to perform this action');
  });

  it('handles save errors in mutation, shows toast, and rethrows', async () => {
    vi.mocked(createAccount).mockRejectedValue(new Error('Firestore error'));

    const { result } = renderHook(() => useAccountMutations());

    await act(async () => {
      await expect(
        result.current.createAccount({
          name: 'Fail',
          type: 'cash',
          initialBalance: 0,
          archived: false,
        }),
      ).rejects.toThrow('Firestore error');
    });

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to save account. Please try again.',
    );
  });

  it('handles recalculate errors, shows toast, and rethrows', async () => {
    vi.mocked(recalculateAccountBalance).mockRejectedValue(
      new Error('Recalc failed'),
    );

    const { result } = renderHook(() => useAccountMutations());

    await act(async () => {
      await expect(result.current.recalculateBalance('acc-1')).rejects.toThrow(
        'Recalc failed',
      );
    });

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to recalculate account balance',
    );
  });
});
