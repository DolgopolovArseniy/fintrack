import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  archiveCategory,
  createCategory,
  subscribeCategories,
  unarchiveCategory,
  updateCategory,
} from './repository';
import type { CategoryInput, CategoryUpdateInput } from './index';

const {
  mockDoc,
  mockCollection,
  mockDeleteField,
  mockOnSnapshot,
  mockServerTimestamp,
  mockSetDoc,
  mockUpdateDoc,
} = vi.hoisted(() => {
  return {
    mockDoc: vi.fn((_colOrDb, ...parts: string[]) => ({
      path: parts.join('/'),
      id: parts[parts.length - 1] ?? 'mock-cat-id',
    })),
    mockCollection: vi.fn((_db, ...parts: string[]) => ({
      path: parts.join('/'),
    })),
    mockDeleteField: vi.fn(() => ({ _methodName: 'deleteField' })),
    mockOnSnapshot:
      vi.fn<
        (
          ref: unknown,
          onNext: (snapshot: unknown) => void,
          onError?: (error: unknown) => void,
        ) => () => void
      >(),
    mockServerTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' })),
    mockSetDoc: vi.fn().mockResolvedValue(undefined),
    mockUpdateDoc: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
  collection: mockCollection,
  deleteField: mockDeleteField,
  onSnapshot: mockOnSnapshot,
  serverTimestamp: mockServerTimestamp,
  setDoc: mockSetDoc,
  updateDoc: mockUpdateDoc,
}));

vi.mock('@/lib/firebase', () => ({
  db: { _type: 'mockFirestoreDb' },
}));

describe('categories repository unit tests', () => {
  const mockUid = 'user-test-789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('subscribeCategories', () => {
    it('sets up onSnapshot subscription and returns unsubscribe function', () => {
      const mockUnsubscribe = vi.fn();
      let snapshotCallback: ((snapshot: unknown) => void) | null = null;

      mockOnSnapshot.mockImplementation((_ref, onNext) => {
        snapshotCallback = onNext;
        return mockUnsubscribe;
      });

      const onData = vi.fn();
      const onError = vi.fn();

      const unsubscribe = subscribeCategories(mockUid, onData, onError);

      expect(mockOnSnapshot).toHaveBeenCalled();

      // Trigger snapshot callback with docs
      const mockTimestamp = { toDate: () => new Date('2026-06-01') };
      snapshotCallback!({
        docs: [
          {
            id: 'cat-food',
            data: () => ({
              type: 'expense',
              icon: 'utensils',
              color: 'orange',
              archived: false,
              systemKey: 'food',
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
            }),
          },
        ],
      });

      expect(onData).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'cat-food',
          type: 'expense',
          systemKey: 'food',
        }),
      ]);

      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('routes error to onError callback as AppError', () => {
      mockOnSnapshot.mockImplementation((_ref, _onNext, onError) => {
        if (onError) {
          onError({ code: 'permission-denied', message: 'Denied' });
        }
        return () => {};
      });

      const onData = vi.fn();
      const onError = vi.fn();

      subscribeCategories(mockUid, onData, onError);

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'permission-denied',
        }),
      );
    });
  });

  describe('createCategory', () => {
    it('creates category with trimmed values and server timestamps', async () => {
      const input: CategoryInput = {
        type: 'expense',
        name: '  Groceries  ',
        icon: '  shopping-cart  ',
        color: 'emerald',
      };

      const id = await createCategory(mockUid, input);

      expect(id).toBe('mock-cat-id');
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'mock-cat-id' }),
        expect.objectContaining({
          type: 'expense',
          name: 'Groceries',
          icon: 'shopping-cart',
          color: 'emerald',
          archived: false,
          createdAt: { _methodName: 'serverTimestamp' },
          updatedAt: { _methodName: 'serverTimestamp' },
        }),
      );
    });

    it('throws AppError when validation fails', async () => {
      const invalidInput = {
        type: 'invalid_type',
        name: '',
        icon: '',
        color: 'unknown_color',
      } as unknown as CategoryInput;

      await expect(createCategory(mockUid, invalidInput)).rejects.toMatchObject(
        {
          code: 'validation',
        },
      );
    });

    it('translates Firestore errors to AppError', async () => {
      mockSetDoc.mockRejectedValueOnce({
        code: 'unavailable',
        message: 'Network offline',
      });

      const input: CategoryInput = {
        type: 'income',
        name: 'Freelance',
        icon: 'laptop',
        color: 'sky',
      };

      await expect(createCategory(mockUid, input)).rejects.toMatchObject({
        code: 'offline',
      });
    });
  });

  describe('updateCategory', () => {
    it('updates category fields with trimmed strings and server updatedAt', async () => {
      const input: CategoryUpdateInput = {
        name: '  New Category Name  ',
        icon: '  sparkles  ',
        color: 'violet',
        archived: true,
      };

      await updateCategory(mockUid, 'cat-target', input);

      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({
          path: `users/${mockUid}/categories/cat-target`,
        }),
        expect.objectContaining({
          name: 'New Category Name',
          icon: 'sparkles',
          color: 'violet',
          archived: true,
          updatedAt: { _methodName: 'serverTimestamp' },
        }),
      );
    });

    it('deletes name field via deleteField() if empty string is passed', async () => {
      await updateCategory(mockUid, 'cat-target', {
        name: '   ',
      });

      expect(mockDeleteField).toHaveBeenCalled();
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: { _methodName: 'deleteField' },
        }),
      );
    });

    it('translates Firestore update errors to AppError', async () => {
      mockUpdateDoc.mockRejectedValueOnce({
        code: 'permission-denied',
        message: 'Permission denied',
      });

      await expect(
        updateCategory(mockUid, 'cat-target', { name: 'Attempt' }),
      ).rejects.toMatchObject({
        code: 'permission-denied',
      });
    });
  });

  describe('archiveCategory & unarchiveCategory', () => {
    it('archiveCategory sets archived to true', async () => {
      await archiveCategory(mockUid, 'cat-archive');

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({
          path: `users/${mockUid}/categories/cat-archive`,
        }),
        expect.objectContaining({
          archived: true,
        }),
      );
    });

    it('unarchiveCategory sets archived to false', async () => {
      await unarchiveCategory(mockUid, 'cat-restore');

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({
          path: `users/${mockUid}/categories/cat-restore`,
        }),
        expect.objectContaining({
          archived: false,
        }),
      );
    });
  });
});
