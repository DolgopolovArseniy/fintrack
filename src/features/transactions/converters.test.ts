import { describe, expect, it, vi } from 'vitest';
import { logger } from '@/lib/logger';
import { parseSnapshotDocs } from '@/lib/firestore/createConverter';
import { transactionConverter, transactionsCollectionRef } from './converters';
import { transactionSchema, type Transaction } from './schemas';

type DocSnapshot = Parameters<typeof transactionConverter.fromFirestore>[0];
type QuerySnapshotLike = Parameters<typeof parseSnapshotDocs>[0];

describe('transactions converters', () => {
  const mockDate = new Date('2026-05-15T12:00:00.000Z');
  const mockTimestamp = {
    toDate: () => mockDate,
  };

  describe('transactionConverter', () => {
    describe('toFirestore', () => {
      it('strips the id field when converting to Firestore document data', () => {
        const transaction: Transaction = {
          id: 'tx-123',
          type: 'expense',
          amount: 1550,
          accountId: 'acc-main',
          categoryId: 'cat-food',
          date: '2026-05-15',
          note: 'Groceries',
          tags: ['food', 'supermarket'],
          createdAt: mockDate,
          updatedAt: mockDate,
        };

        const firestoreData = transactionConverter.toFirestore(transaction);

        expect(firestoreData).not.toHaveProperty('id');
        expect(firestoreData).toEqual({
          type: 'expense',
          amount: 1550,
          accountId: 'acc-main',
          categoryId: 'cat-food',
          date: '2026-05-15',
          note: 'Groceries',
          tags: ['food', 'supermarket'],
          createdAt: mockDate,
          updatedAt: mockDate,
        });
      });
    });

    describe('fromFirestore', () => {
      it('converts Firestore timestamps to Dates and attaches snapshot id', () => {
        const mockSnapshot = {
          id: 'tx-456',
          data: vi.fn().mockReturnValue({
            type: 'income',
            amount: 250000,
            accountId: 'acc-main',
            categoryId: 'cat-salary',
            date: '2026-05-15',
            note: 'Monthly salary',
            tags: ['work'],
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          }),
        } as unknown as DocSnapshot;

        const tx = transactionConverter.fromFirestore(mockSnapshot);

        expect(tx).toEqual({
          id: 'tx-456',
          type: 'income',
          amount: 250000,
          accountId: 'acc-main',
          categoryId: 'cat-salary',
          date: '2026-05-15',
          note: 'Monthly salary',
          tags: ['work'],
          createdAt: mockDate,
          updatedAt: mockDate,
        });
      });

      it('throws InvalidDocumentError when document data is corrupt or fails validation', () => {
        const corruptSnapshot = {
          id: 'bad-tx',
          data: vi.fn().mockReturnValue({
            type: 'invalid-type',
            amount: -50,
            accountId: '',
            categoryId: '',
            date: 'invalid-date',
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          }),
        } as unknown as DocSnapshot;

        expect(() =>
          transactionConverter.fromFirestore(corruptSnapshot),
        ).toThrowError(/Invalid document \[bad-tx\]/);
      });
    });
  });

  describe('transactionsCollectionRef', () => {
    it('creates a collection reference with converter attached', () => {
      const ref = transactionsCollectionRef('user-xyz');
      expect(ref).toBeDefined();
      expect(ref.converter).toBe(transactionConverter);
    });
  });

  describe('parseSnapshotDocs with transactionSchema', () => {
    it('skips corrupt documents with warning and returns valid transactions', () => {
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

      const validDoc1 = {
        id: 'tx-1',
        data: () => ({
          type: 'expense',
          amount: 500,
          accountId: 'acc-1',
          categoryId: 'cat-1',
          date: '2026-05-10',
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        }),
      };

      const corruptDoc = {
        id: 'tx-corrupt',
        data: () => ({
          type: 'expense',
          amount: 'not-a-number',
        }),
      };

      const validDoc2 = {
        id: 'tx-2',
        data: () => ({
          type: 'income',
          amount: 1000,
          accountId: 'acc-1',
          categoryId: 'cat-2',
          date: '2026-05-12',
          note: 'Freelance',
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        }),
      };

      const snapshot = {
        docs: [validDoc1, corruptDoc, validDoc2],
      } as unknown as QuerySnapshotLike;

      const items = parseSnapshotDocs(snapshot, transactionSchema);

      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe('tx-1');
      expect(items[1]?.id).toBe('tx-2');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skipping corrupt document [tx-corrupt]'),
        expect.anything(),
      );

      warnSpy.mockRestore();
    });
  });
});
