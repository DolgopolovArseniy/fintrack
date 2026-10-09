import { describe, expect, it, vi } from 'vitest';
import { logger } from '@/lib/logger';
import { parseSnapshotDocs } from '@/lib/firestore/createConverter';
import { budgetConverter, budgetsCollectionRef } from './converters';
import { budgetSchema, type Budget } from './schemas';

type DocSnapshot = Parameters<typeof budgetConverter.fromFirestore>[0];
type QuerySnapshotLike = Parameters<typeof parseSnapshotDocs>[0];

describe('budgets converters', () => {
  const mockDate = new Date('2026-10-01T00:00:00.000Z');
  const mockTimestamp = {
    toDate: () => mockDate,
  };

  describe('budgetConverter', () => {
    describe('toFirestore', () => {
      it('strips the id field when converting to Firestore document data', () => {
        const budget: Budget = {
          id: '2026-10_cat-groceries',
          categoryId: 'cat-groceries',
          month: '2026-10',
          limit: 30000,
          createdAt: mockDate,
          updatedAt: mockDate,
        };

        const firestoreData = budgetConverter.toFirestore(budget);

        expect(firestoreData).not.toHaveProperty('id');
        expect(firestoreData).toEqual({
          categoryId: 'cat-groceries',
          month: '2026-10',
          limit: 30000,
          createdAt: mockDate,
          updatedAt: mockDate,
        });
      });
    });

    describe('fromFirestore', () => {
      it('converts Firestore timestamps to Dates and attaches snapshot id', () => {
        const mockSnapshot = {
          id: '2026-10_cat-food',
          data: vi.fn().mockReturnValue({
            categoryId: 'cat-food',
            month: '2026-10',
            limit: 25000,
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          }),
        } as unknown as DocSnapshot;

        const budget = budgetConverter.fromFirestore(mockSnapshot);

        expect(budget).toEqual({
          id: '2026-10_cat-food',
          categoryId: 'cat-food',
          month: '2026-10',
          limit: 25000,
          createdAt: mockDate,
          updatedAt: mockDate,
        });
      });

      it('throws InvalidDocumentError when document data is corrupt or fails validation', () => {
        const corruptSnapshot = {
          id: 'bad-id',
          data: vi.fn().mockReturnValue({
            categoryId: 'cat-food',
            month: '2026-10',
            limit: -500, // Invalid limit
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          }),
        } as unknown as DocSnapshot;

        expect(() =>
          budgetConverter.fromFirestore(corruptSnapshot),
        ).toThrowError(/Invalid document \[bad-id\]/);
      });
    });
  });

  describe('budgetsCollectionRef', () => {
    it('creates a collection reference with converter attached', () => {
      const ref = budgetsCollectionRef('user-xyz');
      expect(ref).toBeDefined();
      expect(ref.converter).toBe(budgetConverter);
    });
  });

  describe('parseSnapshotDocs with budgetSchema', () => {
    it('skips corrupt documents with warning and returns valid budgets', () => {
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

      const validDoc1 = {
        id: '2026-10_cat-1',
        data: () => ({
          categoryId: 'cat-1',
          month: '2026-10',
          limit: 15000,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        }),
      };

      const corruptDoc = {
        id: 'corrupt-doc-id',
        data: () => ({
          month: 'invalid-month',
        }),
      };

      const validDoc2 = {
        id: '2026-10_cat-2',
        data: () => ({
          categoryId: 'cat-2',
          month: '2026-10',
          limit: 20000,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        }),
      };

      const snapshot = {
        docs: [validDoc1, corruptDoc, validDoc2],
      } as unknown as QuerySnapshotLike;

      const items = parseSnapshotDocs(snapshot, budgetSchema);

      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe('2026-10_cat-1');
      expect(items[1]?.id).toBe('2026-10_cat-2');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skipping corrupt document [corrupt-doc-id]'),
        expect.anything(),
      );

      warnSpy.mockRestore();
    });
  });
});
