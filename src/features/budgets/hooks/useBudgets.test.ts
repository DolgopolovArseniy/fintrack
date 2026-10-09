import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/features/auth';
import { AppError } from '@/lib/errors';
import { subscribeBudgetsByMonth } from '../repository';
import type { Budget } from '../schemas';
import { useBudgets } from './useBudgets';

vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../repository', () => ({
  subscribeBudgetsByMonth: vi.fn(),
}));

describe('useBudgets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('subscribes to budgets for a valid month and receives data', () => {
    let capturedOnData: (data: Budget[]) => void = () => {};
    const mockUnsubscribe = vi.fn();

    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-123' },
    } as ReturnType<typeof useAuth>);

    vi.mocked(subscribeBudgetsByMonth).mockImplementation(
      (_uid, _month, onData) => {
        capturedOnData = onData;
        return mockUnsubscribe;
      },
    );

    const { result } = renderHook(() => useBudgets('2026-10'));

    expect(subscribeBudgetsByMonth).toHaveBeenCalledWith(
      'user-123',
      '2026-10',
      expect.any(Function),
      expect.any(Function),
    );

    const mockBudgets: Budget[] = [
      {
        id: '2026-10_cat-1',
        categoryId: 'cat-1',
        month: '2026-10',
        limit: 500000,
        createdAt: new Date('2026-10-01'),
        updatedAt: new Date('2026-10-01'),
      },
    ];

    act(() => {
      capturedOnData(mockBudgets);
    });

    expect(result.current.status).toBe('success');
    if (result.current.status === 'success') {
      expect(result.current.data).toEqual(mockBudgets);
    }
  });

  it('returns empty array when user is not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
    } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useBudgets('2026-10'));

    expect(subscribeBudgetsByMonth).not.toHaveBeenCalled();
    expect(result.current.status).toBe('success');
    if (result.current.status === 'success') {
      expect(result.current.data).toEqual([]);
    }
  });

  it('returns empty array when month is invalid', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-123' },
    } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useBudgets('not-a-month'));

    expect(subscribeBudgetsByMonth).not.toHaveBeenCalled();
    expect(result.current.status).toBe('success');
    if (result.current.status === 'success') {
      expect(result.current.data).toEqual([]);
    }
  });

  it('handles subscription error', () => {
    let capturedOnError: (error: AppError) => void = () => {};
    const mockUnsubscribe = vi.fn();

    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-123' },
    } as ReturnType<typeof useAuth>);

    vi.mocked(subscribeBudgetsByMonth).mockImplementation(
      (_uid, _month, _onData, onError) => {
        capturedOnError = onError;
        return mockUnsubscribe;
      },
    );

    const { result } = renderHook(() => useBudgets('2026-10'));

    const appError = new AppError('permission-denied', 'Permission denied');

    act(() => {
      capturedOnError(appError);
    });

    expect(result.current.status).toBe('error');
    if (result.current.status === 'error') {
      expect(result.current.error.code).toBe('permission-denied');
    }
  });
});
