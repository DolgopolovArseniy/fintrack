import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  archiveAccount,
  createAccount,
  recalculateAccountBalance,
  subscribeAccounts,
  unarchiveAccount,
  updateAccount,
} from './repository';
import type { Account, AccountInput, AccountUpdateInput } from './index';

const {
  mockDoc,
  mockCollection,
  mockDeleteField,
  mockGetDoc,
  mockGetDocs,
  mockIncrement,
  mockOnSnapshot,
  mockQuery,
  mockServerTimestamp,
  mockSetDoc,
  mockUpdateDoc,
  mockWhere,
  mockWriteBatch,
  mockBatchUpdate,
  mockBatchCommit,
} = vi.hoisted(() => {
  const batchUpdate = vi.fn();
  const batchCommit = vi.fn().mockResolvedValue(undefined);

  return {
    mockDoc: vi.fn((_colOrDb, ...parts: string[]) => ({
      path: parts.join('/'),
      id: parts[parts.length - 1] ?? 'mock-acc-id',
      withConverter: vi.fn().mockReturnThis(),
    })),
    mockCollection: vi.fn((_db, ...parts: string[]) => ({
      path: parts.join('/'),
      withConverter: vi.fn().mockReturnThis(),
    })),
    mockDeleteField: vi.fn(() => ({ _methodName: 'deleteField' })),
    mockGetDoc: vi.fn(),
    mockGetDocs: vi.fn(),
    mockIncrement: vi.fn((delta: number) => ({
      _methodName: 'increment',
      delta,
    })),
    mockOnSnapshot:
      vi.fn<
        (
          ref: unknown,
          onNext: (snapshot: unknown) => void,
          onError?: (error: unknown) => void,
        ) => () => void
      >(),
    mockQuery: vi.fn((col: unknown) => col),
    mockServerTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' })),
    mockSetDoc: vi.fn().mockResolvedValue(undefined),
    mockUpdateDoc: vi.fn().mockResolvedValue(undefined),
    mockWhere: vi.fn((field: string, op: string, val: unknown) => ({
      field,
      op,
      val,
    })),
    mockBatchUpdate: batchUpdate,
    mockBatchCommit: batchCommit,
    mockWriteBatch: vi.fn(() => ({
      update: batchUpdate,
      commit: batchCommit,
    })),
  };
});

vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
  collection: mockCollection,
  deleteField: mockDeleteField,
  getDoc: mockGetDoc,
  getDocs: mockGetDocs,
  increment: mockIncrement,
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

describe('accounts repository unit tests', () => {
  const mockUid = 'user-test-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('subscribeAccounts', () => {
    it('sets up onSnapshot subscription and returns unsubscribe function', () => {
      const mockUnsubscribe = vi.fn();
      let snapshotCallback: ((snapshot: unknown) => void) | null = null;

      mockOnSnapshot.mockImplementation((_ref, onNext) => {
        snapshotCallback = onNext;
        return mockUnsubscribe;
      });

      const onData = vi.fn();
      const onError = vi.fn();

      const unsubscribe = subscribeAccounts(mockUid, onData, onError);

      expect(mockOnSnapshot).toHaveBeenCalled();

      const mockTimestamp = { toDate: () => new Date('2026-01-01') };
      snapshotCallback!({
        docs: [
          {
            id: 'acc-main',
            data: () => ({
              type: 'cash',
              balance: 5000,
              initialBalance: 5000,
              archived: false,
              systemKey: 'main',
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
            }),
          },
        ],
      });

      expect(onData).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'acc-main',
          systemKey: 'main',
          balance: 5000,
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

      subscribeAccounts(mockUid, onData, onError);

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'permission-denied',
        }),
      );
    });
  });

  describe('createAccount', () => {
    it('creates account with trimmed name and default balance equal to initialBalance', async () => {
      const input: AccountInput = {
        type: 'card',
        name: '  T-Bank Black  ',
        initialBalance: 10000,
      };

      const id = await createAccount(mockUid, input);

      expect(id).toBe('mock-acc-id');
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'mock-acc-id' }),
        expect.objectContaining({
          type: 'card',
          name: 'T-Bank Black',
          initialBalance: 10000,
          balance: 10000,
          archived: false,
          createdAt: { _methodName: 'serverTimestamp' },
          updatedAt: { _methodName: 'serverTimestamp' },
        }),
      );
    });

    it('throws validation AppError when input is invalid', async () => {
      const invalidInput = {
        type: 'crypto',
        initialBalance: 0,
      } as unknown as AccountInput;

      await expect(createAccount(mockUid, invalidInput)).rejects.toMatchObject({
        code: 'validation',
      });
    });

    it('translates Firestore errors to AppError', async () => {
      mockSetDoc.mockRejectedValueOnce({
        code: 'unavailable',
        message: 'Offline',
      });

      const input: AccountInput = {
        type: 'cash',
        systemKey: 'main',
        initialBalance: 0,
      };

      await expect(createAccount(mockUid, input)).rejects.toMatchObject({
        code: 'offline',
      });
    });
  });

  describe('updateAccount', () => {
    const currentAccount: Account = {
      id: 'acc-1',
      type: 'card',
      balance: 15000,
      initialBalance: 10000,
      archived: false,
      name: 'Old Card',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };

    it('updates account name and type without modifying balance when initialBalance is unchanged', async () => {
      const input: AccountUpdateInput = {
        name: '  New Card Name  ',
        type: 'bank',
      };

      await updateAccount(mockUid, 'acc-1', currentAccount, input);

      expect(mockWriteBatch).toHaveBeenCalled();
      expect(mockBatchUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: 'New Card Name',
          type: 'bank',
          updatedAt: { _methodName: 'serverTimestamp' },
        }),
      );
      // Balance increment should NOT be present
      expect(mockIncrement).not.toHaveBeenCalled();
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });

    it('applies atomic increment delta to balance when initialBalance changes', async () => {
      const input: AccountUpdateInput = {
        initialBalance: 20000, // old was 10000, delta = +10000
      };

      await updateAccount(mockUid, 'acc-1', currentAccount, input);

      expect(mockIncrement).toHaveBeenCalledWith(10000);
      expect(mockBatchUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          initialBalance: 20000,
          balance: {
            _methodName: 'increment',
            delta: 10000,
          },
        }),
      );
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    });

    it('deletes name via deleteField() when empty string is passed', async () => {
      await updateAccount(mockUid, 'acc-1', currentAccount, {
        name: '   ',
      });

      expect(mockDeleteField).toHaveBeenCalled();
      expect(mockBatchUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: { _methodName: 'deleteField' },
        }),
      );
    });
  });

  describe('archiveAccount & unarchiveAccount', () => {
    it('archiveAccount sets archived: true', async () => {
      await archiveAccount(mockUid, 'acc-arch');

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({
          path: `users/${mockUid}/accounts/acc-arch`,
        }),
        expect.objectContaining({
          archived: true,
          updatedAt: { _methodName: 'serverTimestamp' },
        }),
      );
    });

    it('unarchiveAccount sets archived: false', async () => {
      await unarchiveAccount(mockUid, 'acc-rest');

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({
          path: `users/${mockUid}/accounts/acc-rest`,
        }),
        expect.objectContaining({
          archived: false,
          updatedAt: { _methodName: 'serverTimestamp' },
        }),
      );
    });
  });

  describe('recalculateAccountBalance', () => {
    it('recalculates balance accurately based on initialBalance and transactions', async () => {
      const mockTimestamp = { toDate: () => new Date('2026-01-01') };

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'acc-rec',
        data: () => ({
          type: 'card',
          name: 'Debit Card',
          initialBalance: 1000,
          balance: 800, // Out of sync, should be 1000 + 500 - 200 = 1300
          archived: false,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        }),
      });

      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'tx-1',
            data: () => ({
              type: 'income',
              amount: 500,
              accountId: 'acc-rec',
              categoryId: 'cat-salary',
              date: '2026-01-05',
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
            }),
          },
          {
            id: 'tx-2',
            data: () => ({
              type: 'expense',
              amount: 200,
              accountId: 'acc-rec',
              categoryId: 'cat-food',
              date: '2026-01-06',
              createdAt: mockTimestamp,
              updatedAt: mockTimestamp,
            }),
          },
        ],
      });

      const result = await recalculateAccountBalance(mockUid, 'acc-rec');

      expect(result).toEqual({
        previousBalance: 800,
        newBalance: 1300,
        delta: 500,
        transactionCount: 2,
      });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          balance: 1300,
          updatedAt: { _methodName: 'serverTimestamp' },
        }),
      );
    });

    it('correctly handles recalculation when there are zero transactions', async () => {
      const mockTimestamp = { toDate: () => new Date('2026-01-01') };

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'acc-zero',
        data: () => ({
          type: 'cash',
          systemKey: 'main',
          initialBalance: 5000,
          balance: 4500,
          archived: false,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        }),
      });

      mockGetDocs.mockResolvedValueOnce({
        docs: [],
      });

      const result = await recalculateAccountBalance(mockUid, 'acc-zero');

      expect(result).toEqual({
        previousBalance: 4500,
        newBalance: 5000,
        delta: 500,
        transactionCount: 0,
      });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          balance: 5000,
        }),
      );
    });

    it('throws AppError if account document is not found', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
        data: () => undefined,
      });

      await expect(
        recalculateAccountBalance(mockUid, 'non-existent-acc'),
      ).rejects.toMatchObject({
        code: 'unknown',
      });
    });
  });
});
