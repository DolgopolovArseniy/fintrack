import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  copyBudgetsFromMonth,
  createBudget,
  deleteBudget,
  subscribeBudgetsByMonth,
  updateBudget,
} from './repository';
import type { BudgetInput, BudgetUpdateInput } from './index';

const {
  mockDoc,
  mockCollection,
  mockDeleteDoc,
  mockGetDocs,
  mockOnSnapshot,
  mockQuery,
  mockServerTimestamp,
  mockSetDoc,
  mockUpdateDoc,
  mockWhere,
  mockWriteBatch,
} = vi.hoisted(() => {
  const batchSet = vi.fn();
  const batchCommit = vi.fn().mockResolvedValue(undefined);

  return {
    mockDoc: vi.fn((_colOrDb: unknown, ...parts: string[]) => ({
      path: parts.join('/'),
      id: parts[parts.length - 1] ?? 'mock-id',
    })),
    mockCollection: vi.fn((_db: unknown, ...parts: string[]) => ({
      path: parts.join('/'),
    })),
    mockDeleteDoc: vi.fn().mockResolvedValue(undefined),
    mockGetDocs: vi.fn(),
    mockOnSnapshot:
      vi.fn<
        (
          ref: unknown,
          onNext: (snapshot: unknown) => void,
          onError?: (error: unknown) => void,
        ) => () => void
      >(),
    mockQuery: vi.fn((col: unknown) => ({ _type: 'query', col })),
    mockServerTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' })),
    mockSetDoc: vi.fn().mockResolvedValue(undefined),
    mockUpdateDoc: vi.fn().mockResolvedValue(undefined),
    mockWhere: vi.fn((field: string, op: string, val: unknown) => ({
      field,
      op,
      val,
    })),
    mockWriteBatch: vi.fn(() => ({
      set: batchSet,
      commit: batchCommit,
    })),
    batchSet,
    batchCommit,
  };
});

vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
  collection: mockCollection,
  deleteDoc: mockDeleteDoc,
  getDocs: mockGetDocs,
  onSnapshot: mockOnSnapshot,
  query: mockQuery,
  serverTimestamp: mockServerTimestamp,
  setDoc: mockSetDoc,
  updateDoc: mockUpdateDoc,
  where: mockWhere,
  writeBatch: mockWriteBatch,
}));

vi.mock('@/lib/firebase', () => ({
  db: { _type: 'mockFirestoreDb' },
}));

describe('budgets repository unit tests', () => {
  const mockUid = 'user-test-budgets';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('subscribeBudgetsByMonth', () => {
    it('sets up onSnapshot subscription and returns unsubscribe function', () => {
      const mockUnsubscribe = vi.fn();
      let snapshotCallback: ((snapshot: unknown) => void) | null = null;

      mockOnSnapshot.mockImplementation((_ref, onNext) => {
        snapshotCallback = onNext;
        return mockUnsubscribe;
      });

      const onData = vi.fn();
      const onError = vi.fn();

      const unsubscribe = subscribeBudgetsByMonth(
        mockUid,
        '2026-10',
        onData,
        onError,
      );

      expect(mockOnSnapshot).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalledWith('month', '==', '2026-10');

      const mockTimestamp = { toDate: () => new Date('2026-10-01') };
      snapshotCallback!({
        docs: [
          {
            id: '2026-10_cat-groceries',
            data: () => ({
              categoryId: 'cat-groceries',
              month: '2026-10',
              limit: 30000,
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
            }),
          },
        ],
      });

      expect(onData).toHaveBeenCalledWith([
        expect.objectContaining({
          id: '2026-10_cat-groceries',
          categoryId: 'cat-groceries',
          month: '2026-10',
          limit: 30000,
        }),
      ]);

      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('calls onError callback when month format is invalid', () => {
      const onData = vi.fn();
      const onError = vi.fn();

      const unsubscribe = subscribeBudgetsByMonth(
        mockUid,
        'invalid-month',
        onData,
        onError,
      );

      expect(onError).toHaveBeenCalledTimes(1);
      const callArg = onError.mock.calls[0]?.[0] as
        { message?: string } | undefined;
      expect(callArg?.message).toContain('Invalid month');
      expect(typeof unsubscribe).toBe('function');
    });

    it('routes Firestore error to onError callback as AppError', () => {
      mockOnSnapshot.mockImplementation((_ref, _onNext, onError) => {
        if (onError) {
          onError({ code: 'permission-denied', message: 'Permission denied' });
        }
        return () => {};
      });

      const onData = vi.fn();
      const onError = vi.fn();

      subscribeBudgetsByMonth(mockUid, '2026-10', onData, onError);

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'permission-denied',
        }),
      );
    });
  });

  describe('createBudget', () => {
    it('creates budget document with deterministic ID and server timestamps', async () => {
      const input: BudgetInput = {
        categoryId: 'cat-food',
        month: '2026-10',
        limit: 25000,
      };

      const budgetId = await createBudget(mockUid, input);

      expect(budgetId).toBe('2026-10_cat-food');
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({
          path: `users/${mockUid}/budgets/2026-10_cat-food`,
        }),
        expect.objectContaining({
          categoryId: 'cat-food',
          month: '2026-10',
          limit: 25000,
          createdAt: { _methodName: 'serverTimestamp' },
          updatedAt: { _methodName: 'serverTimestamp' },
        }),
      );
    });

    it('throws AppError on validation failure', async () => {
      const invalidInput: unknown = {
        categoryId: '',
        month: '2026-10',
        limit: -500,
      };

      await expect(
        createBudget(mockUid, invalidInput as BudgetInput),
      ).rejects.toMatchObject({
        code: 'validation',
      });
    });

    it('translates Firestore errors to AppError', async () => {
      mockSetDoc.mockRejectedValueOnce({
        code: 'unavailable',
        message: 'Network offline',
      });

      const input: BudgetInput = {
        categoryId: 'cat-food',
        month: '2026-10',
        limit: 25000,
      };

      await expect(createBudget(mockUid, input)).rejects.toMatchObject({
        code: 'offline',
      });
    });
  });

  describe('updateBudget', () => {
    it('updates limit and sets updatedAt to serverTimestamp', async () => {
      const input: BudgetUpdateInput = {
        limit: 35000,
      };

      await updateBudget(mockUid, '2026-10_cat-food', input);

      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({
          path: `users/${mockUid}/budgets/2026-10_cat-food`,
        }),
        expect.objectContaining({
          limit: 35000,
          updatedAt: { _methodName: 'serverTimestamp' },
        }),
      );
    });

    it('throws AppError on validation failure for invalid limit', async () => {
      const invalidInput: BudgetUpdateInput = { limit: 0 };

      await expect(
        updateBudget(mockUid, '2026-10_cat-food', invalidInput),
      ).rejects.toMatchObject({
        code: 'validation',
      });
    });

    it('translates Firestore errors to AppError', async () => {
      mockUpdateDoc.mockRejectedValueOnce({
        code: 'permission-denied',
        message: 'Permission denied',
      });

      await expect(
        updateBudget(mockUid, '2026-10_cat-food', { limit: 5000 }),
      ).rejects.toMatchObject({
        code: 'permission-denied',
      });
    });
  });

  describe('deleteBudget', () => {
    it('deletes document via deleteDoc', async () => {
      await deleteBudget(mockUid, '2026-10_cat-food');

      expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
      expect(mockDeleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({
          path: `users/${mockUid}/budgets/2026-10_cat-food`,
        }),
      );
    });

    it('translates Firestore errors to AppError', async () => {
      mockDeleteDoc.mockRejectedValueOnce({
        code: 'permission-denied',
        message: 'Permission denied',
      });

      await expect(
        deleteBudget(mockUid, '2026-10_cat-food'),
      ).rejects.toMatchObject({
        code: 'permission-denied',
      });
    });
  });

  describe('copyBudgetsFromMonth', () => {
    const mockTimestamp = { toDate: () => new Date('2026-09-01') };

    it('throws AppError when sourceMonth or targetMonth format is invalid', async () => {
      await expect(
        copyBudgetsFromMonth(mockUid, 'invalid', '2026-10'),
      ).rejects.toThrow(/Invalid sourceMonth/);

      await expect(
        copyBudgetsFromMonth(mockUid, '2026-09', 'invalid'),
      ).rejects.toThrow(/Invalid targetMonth/);
    });

    it('returns { copiedCount: 0, skippedCount: 0 } when source month has no budgets', async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [],
      });

      const result = await copyBudgetsFromMonth(mockUid, '2026-09', '2026-10');

      expect(result).toEqual({ copiedCount: 0, skippedCount: 0 });
    });

    it('copies all source budgets to target month when overwrite is false and target is empty', async () => {
      const sourceDocs = [
        {
          id: '2026-09_cat-1',
          data: () => ({
            categoryId: 'cat-1',
            month: '2026-09',
            limit: 20000,
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          }),
        },
        {
          id: '2026-09_cat-2',
          data: () => ({
            categoryId: 'cat-2',
            month: '2026-09',
            limit: 10000,
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          }),
        },
      ];

      // 1. Source getDocs
      mockGetDocs.mockResolvedValueOnce({ docs: sourceDocs });
      // 2. Target getDocs (empty)
      mockGetDocs.mockResolvedValueOnce({ docs: [] });

      const result = await copyBudgetsFromMonth(mockUid, '2026-09', '2026-10', {
        overwrite: false,
      });

      expect(result).toEqual({ copiedCount: 2, skippedCount: 0 });
      expect(mockWriteBatch).toHaveBeenCalled();
    });

    it('skips existing categories when overwrite is false and returns skippedCount', async () => {
      const sourceDocs = [
        {
          id: '2026-09_cat-1',
          data: () => ({
            categoryId: 'cat-1',
            month: '2026-09',
            limit: 20000,
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          }),
        },
        {
          id: '2026-09_cat-2',
          data: () => ({
            categoryId: 'cat-2',
            month: '2026-09',
            limit: 10000,
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          }),
        },
      ];

      const targetDocs = [
        {
          id: '2026-10_cat-1',
          data: () => ({
            categoryId: 'cat-1',
            month: '2026-10',
            limit: 25000,
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          }),
        },
      ];

      // 1. Source getDocs
      mockGetDocs.mockResolvedValueOnce({ docs: sourceDocs });
      // 2. Target getDocs (cat-1 exists)
      mockGetDocs.mockResolvedValueOnce({ docs: targetDocs });

      const result = await copyBudgetsFromMonth(mockUid, '2026-09', '2026-10', {
        overwrite: false,
      });

      expect(result).toEqual({ copiedCount: 1, skippedCount: 1 });
    });

    it('overwrites existing categories when overwrite is true', async () => {
      const sourceDocs = [
        {
          id: '2026-09_cat-1',
          data: () => ({
            categoryId: 'cat-1',
            month: '2026-09',
            limit: 20000,
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          }),
        },
      ];

      // 1. Source getDocs only (target is not checked when overwrite is true)
      mockGetDocs.mockResolvedValueOnce({ docs: sourceDocs });

      const result = await copyBudgetsFromMonth(mockUid, '2026-09', '2026-10', {
        overwrite: true,
      });

      expect(result).toEqual({ copiedCount: 1, skippedCount: 0 });
    });

    it('returns { copiedCount: 0, skippedCount: N } when all categories already exist and overwrite is false', async () => {
      const sourceDocs = [
        {
          id: '2026-09_cat-1',
          data: () => ({
            categoryId: 'cat-1',
            month: '2026-09',
            limit: 20000,
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          }),
        },
      ];

      const targetDocs = [
        {
          id: '2026-10_cat-1',
          data: () => ({
            categoryId: 'cat-1',
            month: '2026-10',
            limit: 20000,
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          }),
        },
      ];

      mockGetDocs.mockResolvedValueOnce({ docs: sourceDocs });
      mockGetDocs.mockResolvedValueOnce({ docs: targetDocs });

      const result = await copyBudgetsFromMonth(mockUid, '2026-09', '2026-10', {
        overwrite: false,
      });

      expect(result).toEqual({ copiedCount: 0, skippedCount: 1 });
    });
  });
});
