import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/features/auth';
import { subscribeTransactionsByMonth } from '../repository';
import type { Transaction } from '../schemas';
import { useTransactions } from './useTransactions';

vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../repository', () => ({
  subscribeTransactionsByMonth: vi.fn(),
}));

describe('useTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('subscribes with user uid and month, and receives transactions', () => {
    let capturedOnData: (data: Transaction[]) => void = () => {};
    const mockUnsubscribe = vi.fn();

    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-123' },
    } as ReturnType<typeof useAuth>);

    vi.mocked(subscribeTransactionsByMonth).mockImplementation(
      (_uid, _month, onData) => {
        capturedOnData = onData;
        return mockUnsubscribe;
      },
    );

    const { result } = renderHook(() => useTransactions('2026-10'));

    expect(subscribeTransactionsByMonth).toHaveBeenCalledWith(
      'user-123',
      '2026-10',
      expect.any(Function),
      expect.any(Function),
    );

    const mockTransactions: Transaction[] = [
      {
        id: 'tx-1',
        type: 'expense',
        amount: 1500,
        accountId: 'acc-1',
        categoryId: 'cat-1',
        date: '2026-10-12',
        createdAt: new Date('2026-10-12T10:00:00Z'),
        updatedAt: new Date('2026-10-12T10:00:00Z'),
      },
    ];

    act(() => {
      capturedOnData(mockTransactions);
    });

    expect(result.current.status).toBe('success');
    if (result.current.status === 'success') {
      expect(result.current.data).toEqual(mockTransactions);
    }
  });

  it('returns empty array when user is not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
    } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useTransactions('2026-10'));

    expect(subscribeTransactionsByMonth).not.toHaveBeenCalled();
    expect(result.current.status).toBe('success');
    if (result.current.status === 'success') {
      expect(result.current.data).toEqual([]);
    }
  });

  it('returns empty array when month is invalid', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-123' },
    } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useTransactions('invalid-month'));

    expect(subscribeTransactionsByMonth).not.toHaveBeenCalled();
    expect(result.current.status).toBe('success');
    if (result.current.status === 'success') {
      expect(result.current.data).toEqual([]);
    }
  });
});
