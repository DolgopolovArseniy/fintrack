import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth';
import {
  copyBudgetsFromMonth,
  createBudget,
  deleteBudget,
  updateBudget,
} from '../repository';
import { useBudgetMutations } from './useBudgetMutations';

vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('sonner', () => {
  const toastMock = vi.fn();
  (
    toastMock as unknown as { success: unknown; error: unknown; info: unknown }
  ).success = vi.fn();
  (
    toastMock as unknown as { success: unknown; error: unknown; info: unknown }
  ).error = vi.fn();
  (
    toastMock as unknown as { success: unknown; error: unknown; info: unknown }
  ).info = vi.fn();
  return { toast: toastMock };
});

vi.mock('../repository', () => ({
  createBudget: vi.fn(),
  updateBudget: vi.fn(),
  deleteBudget: vi.fn(),
  copyBudgetsFromMonth: vi.fn(),
}));

describe('useBudgetMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-123' },
    } as ReturnType<typeof useAuth>);
  });

  describe('createBudget', () => {
    it('calls createBudget and displays success toast', async () => {
      vi.mocked(createBudget).mockResolvedValue('2026-10_cat-1');

      const { result } = renderHook(() => useBudgetMutations());

      let budgetId = '';
      await act(async () => {
        budgetId = await result.current.createBudget({
          categoryId: 'cat-1',
          month: '2026-10',
          limit: 300000,
        });
      });

      expect(createBudget).toHaveBeenCalledWith('user-123', {
        categoryId: 'cat-1',
        month: '2026-10',
        limit: 300000,
      });
      expect(toast.success).toHaveBeenCalledWith(
        'Budget limit created successfully',
      );
      expect(budgetId).toBe('2026-10_cat-1');
      expect(result.current.isSubmitting).toBe(false);
    });

    it('handles create error, displays error toast, and rethrows', async () => {
      vi.mocked(createBudget).mockRejectedValue(new Error('Firestore error'));

      const { result } = renderHook(() => useBudgetMutations());

      await act(async () => {
        await expect(
          result.current.createBudget({
            categoryId: 'cat-1',
            month: '2026-10',
            limit: 300000,
          }),
        ).rejects.toThrow('Firestore error');
      });

      expect(toast.error).toHaveBeenCalledWith(
        'Failed to save budget limit. Please try again.',
      );
      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe('updateBudget', () => {
    it('calls updateBudget and displays success toast', async () => {
      vi.mocked(updateBudget).mockResolvedValue(undefined);

      const { result } = renderHook(() => useBudgetMutations());

      await act(async () => {
        await result.current.updateBudget('2026-10_cat-1', {
          limit: 450000,
        });
      });

      expect(updateBudget).toHaveBeenCalledWith('user-123', '2026-10_cat-1', {
        limit: 450000,
      });
      expect(toast.success).toHaveBeenCalledWith(
        'Budget limit updated successfully',
      );
      expect(result.current.isSubmitting).toBe(false);
    });

    it('handles update error, displays error toast, and rethrows', async () => {
      vi.mocked(updateBudget).mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useBudgetMutations());

      await act(async () => {
        await expect(
          result.current.updateBudget('2026-10_cat-1', { limit: 450000 }),
        ).rejects.toThrow('Update failed');
      });

      expect(toast.error).toHaveBeenCalledWith(
        'Failed to save budget limit. Please try again.',
      );
      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe('deleteBudget', () => {
    it('calls deleteBudget and displays success toast', async () => {
      vi.mocked(deleteBudget).mockResolvedValue(undefined);

      const { result } = renderHook(() => useBudgetMutations());

      await act(async () => {
        await result.current.deleteBudget('2026-10_cat-1');
      });

      expect(deleteBudget).toHaveBeenCalledWith('user-123', '2026-10_cat-1');
      expect(toast.success).toHaveBeenCalledWith('Budget limit removed');
      expect(result.current.isSubmitting).toBe(false);
    });

    it('handles delete error, displays error toast, and rethrows', async () => {
      vi.mocked(deleteBudget).mockRejectedValue(new Error('Delete error'));

      const { result } = renderHook(() => useBudgetMutations());

      await act(async () => {
        await expect(
          result.current.deleteBudget('2026-10_cat-1'),
        ).rejects.toThrow('Delete error');
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to delete budget limit');
      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe('copyBudgets', () => {
    it('calls copyBudgetsFromMonth and displays success toast when budgets copied', async () => {
      vi.mocked(copyBudgetsFromMonth).mockResolvedValue({
        copiedCount: 3,
        skippedCount: 1,
      });

      const { result } = renderHook(() => useBudgetMutations());

      let copyRes = { copiedCount: 0, skippedCount: 0 };
      await act(async () => {
        copyRes = await result.current.copyBudgets('2026-09', '2026-10', {
          overwrite: false,
        });
      });

      expect(copyBudgetsFromMonth).toHaveBeenCalledWith(
        'user-123',
        '2026-09',
        '2026-10',
        { overwrite: false },
      );
      expect(toast.success).toHaveBeenCalledWith(
        'Successfully copied 3 budgets',
      );
      expect(copyRes).toEqual({ copiedCount: 3, skippedCount: 1 });
      expect(result.current.isCopying).toBe(false);
    });

    it('displays info notification when 0 budgets were copied', async () => {
      vi.mocked(copyBudgetsFromMonth).mockResolvedValue({
        copiedCount: 0,
        skippedCount: 2,
      });

      const { result } = renderHook(() => useBudgetMutations());

      await act(async () => {
        await result.current.copyBudgets('2026-09', '2026-10');
      });

      expect(toast).toHaveBeenCalledWith('No new budgets to copy');
      expect(result.current.isCopying).toBe(false);
    });

    it('handles copy error, displays error toast, and rethrows', async () => {
      vi.mocked(copyBudgetsFromMonth).mockRejectedValue(
        new Error('Copy error'),
      );

      const { result } = renderHook(() => useBudgetMutations());

      await act(async () => {
        await expect(
          result.current.copyBudgets('2026-09', '2026-10'),
        ).rejects.toThrow('Copy error');
      });

      expect(toast.error).toHaveBeenCalledWith(
        'Failed to copy budgets from previous month',
      );
      expect(result.current.isCopying).toBe(false);
    });
  });

  describe('unauthenticated user', () => {
    it('throws AppError if user is not authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
      } as ReturnType<typeof useAuth>);

      const { result } = renderHook(() => useBudgetMutations());

      await act(async () => {
        await expect(
          result.current.createBudget({
            categoryId: 'cat-1',
            month: '2026-10',
            limit: 1000,
          }),
        ).rejects.toThrow();
      });

      expect(createBudget).not.toHaveBeenCalled();
    });
  });
});
