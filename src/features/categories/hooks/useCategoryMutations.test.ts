import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth';
import {
  createCategory,
  updateCategory,
  archiveCategory,
  unarchiveCategory,
} from '../repository';
import { useCategoryMutations } from './useCategoryMutations';

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
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  archiveCategory: vi.fn(),
  unarchiveCategory: vi.fn(),
}));

describe('useCategoryMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-123' },
    } as ReturnType<typeof useAuth>);
  });

  it('calls createCategory and displays success toast', async () => {
    vi.mocked(createCategory).mockResolvedValue('new-cat-id');

    const { result } = renderHook(() => useCategoryMutations());

    let id: string = '';
    await act(async () => {
      id = await result.current.createCategory({
        type: 'expense',
        name: 'Books',
        icon: 'book',
        color: 'indigo',
        archived: false,
      });
    });

    expect(createCategory).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({
        name: 'Books',
      }),
    );
    expect(toast.success).toHaveBeenCalledWith('Category created');
    expect(id).toBe('new-cat-id');
  });

  it('calls updateCategory and displays success toast', async () => {
    vi.mocked(updateCategory).mockResolvedValue(undefined);

    const { result } = renderHook(() => useCategoryMutations());

    await act(async () => {
      await result.current.updateCategory('cat-1', {
        name: 'Updated Books',
      });
    });

    expect(updateCategory).toHaveBeenCalledWith('user-123', 'cat-1', {
      name: 'Updated Books',
    });
    expect(toast.success).toHaveBeenCalledWith('Category updated');
  });

  it('calls archiveCategory and displays success toast', async () => {
    vi.mocked(archiveCategory).mockResolvedValue(undefined);

    const { result } = renderHook(() => useCategoryMutations());

    await act(async () => {
      await result.current.archiveCategory('cat-1');
    });

    expect(archiveCategory).toHaveBeenCalledWith('user-123', 'cat-1');
    expect(toast.success).toHaveBeenCalledWith('Category archived');
  });

  it('calls unarchiveCategory and displays success toast', async () => {
    vi.mocked(unarchiveCategory).mockResolvedValue(undefined);

    const { result } = renderHook(() => useCategoryMutations());

    await act(async () => {
      await result.current.unarchiveCategory('cat-1');
    });

    expect(unarchiveCategory).toHaveBeenCalledWith('user-123', 'cat-1');
    expect(toast.success).toHaveBeenCalledWith('Category restored');
  });

  it('handles error, displays error toast, and rethrows', async () => {
    vi.mocked(createCategory).mockRejectedValue(new Error('Firestore error'));

    const { result } = renderHook(() => useCategoryMutations());

    await act(async () => {
      await expect(
        result.current.createCategory({
          type: 'expense',
          name: 'Fail',
          icon: 'book',
          color: 'red',
          archived: false,
        }),
      ).rejects.toThrow('Firestore error');
    });

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to save category. Please try again.',
    );
  });
});
