import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/features/auth';
import { subscribeCategories } from '../repository';
import type { Category } from '../schemas';
import { useCategories } from './useCategories';

vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../repository', () => ({
  subscribeCategories: vi.fn(),
}));

describe('useCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('subscribes to categories with user uid and receives data', () => {
    let capturedOnData: (data: Category[]) => void = () => {};
    const mockUnsubscribe = vi.fn();

    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-123' },
    } as ReturnType<typeof useAuth>);

    vi.mocked(subscribeCategories).mockImplementation((_uid, onData) => {
      capturedOnData = onData;
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useCategories());

    expect(subscribeCategories).toHaveBeenCalledWith(
      'user-123',
      expect.any(Function),
      expect.any(Function),
    );

    const mockCategories: Category[] = [
      {
        id: 'cat-1',
        type: 'expense',
        name: 'Food',
        icon: 'utensils',
        color: 'orange',
        archived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    act(() => {
      capturedOnData(mockCategories);
    });

    expect(result.current.status).toBe('success');
    if (result.current.status === 'success') {
      expect(result.current.data).toEqual(mockCategories);
    }
  });

  it('returns empty array when user is not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
    } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useCategories());

    expect(subscribeCategories).not.toHaveBeenCalled();
    expect(result.current.status).toBe('success');
    if (result.current.status === 'success') {
      expect(result.current.data).toEqual([]);
    }
  });
});
