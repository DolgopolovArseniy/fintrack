import { describe, expect, it, vi } from 'vitest';
import { logger } from '@/lib/logger';
import { parseSnapshotDocs } from '@/lib/firestore/createConverter';
import { categoryConverter, categoriesCollectionRef } from './converters';
import { categorySchema, type Category } from './schemas';

type DocSnapshot = Parameters<typeof categoryConverter.fromFirestore>[0];
type QuerySnapshotLike = Parameters<typeof parseSnapshotDocs>[0];

describe('categories converters', () => {
  const mockDate = new Date('2026-05-15T12:00:00.000Z');
  const mockTimestamp = {
    toDate: () => mockDate,
  };

  describe('categoryConverter', () => {
    describe('toFirestore', () => {
      it('strips the id field when converting to Firestore document data', () => {
        const category: Category = {
          id: 'cat-123',
          type: 'expense',
          icon: 'utensils',
          color: 'orange',
          archived: false,
          name: 'Restaurants',
          createdAt: mockDate,
          updatedAt: mockDate,
        };

        const firestoreData = categoryConverter.toFirestore(category);

        expect(firestoreData).not.toHaveProperty('id');
        expect(firestoreData).toEqual({
          type: 'expense',
          icon: 'utensils',
          color: 'orange',
          archived: false,
          name: 'Restaurants',
          createdAt: mockDate,
          updatedAt: mockDate,
        });
      });
    });

    describe('fromFirestore', () => {
      it('converts Firestore timestamps to Dates and attaches snapshot id', () => {
        const mockSnapshot = {
          id: 'cat-456',
          data: vi.fn().mockReturnValue({
            type: 'income',
            icon: 'wallet',
            color: 'emerald',
            archived: false,
            systemKey: 'salary',
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          }),
        } as unknown as DocSnapshot;

        const category = categoryConverter.fromFirestore(mockSnapshot);

        expect(category).toEqual({
          id: 'cat-456',
          type: 'income',
          icon: 'wallet',
          color: 'emerald',
          archived: false,
          systemKey: 'salary',
          createdAt: mockDate,
          updatedAt: mockDate,
        });
      });

      it('throws InvalidDocumentError when document data is corrupt or fails validation', () => {
        const corruptSnapshot = {
          id: 'bad-cat',
          data: vi.fn().mockReturnValue({
            type: 'invalid-type',
            icon: 'icon',
            color: 'not-a-color',
            archived: false,
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          }),
        } as unknown as DocSnapshot;

        expect(() =>
          categoryConverter.fromFirestore(corruptSnapshot),
        ).toThrowError(/Invalid document \[bad-cat\]/);
      });
    });
  });

  describe('categoriesCollectionRef', () => {
    it('creates a collection reference with converter attached', () => {
      const ref = categoriesCollectionRef('user-xyz');
      expect(ref).toBeDefined();
      expect(ref.converter).toBe(categoryConverter);
    });
  });

  describe('parseSnapshotDocs with categorySchema', () => {
    it('skips corrupt documents with warning and returns valid categories', () => {
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

      const validDoc1 = {
        id: 'cat-1',
        data: () => ({
          type: 'expense',
          icon: 'car',
          color: 'sky',
          archived: false,
          name: 'Transport',
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        }),
      };

      const corruptDoc = {
        id: 'cat-corrupt',
        data: () => ({
          // missing required fields
          type: 'unknown',
        }),
      };

      const validDoc2 = {
        id: 'cat-2',
        data: () => ({
          type: 'income',
          icon: 'gift',
          color: 'teal',
          archived: true,
          systemKey: 'gift',
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        }),
      };

      const snapshot = {
        docs: [validDoc1, corruptDoc, validDoc2],
      } as unknown as QuerySnapshotLike;

      const items = parseSnapshotDocs(snapshot, categorySchema);

      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe('cat-1');
      expect(items[1]?.id).toBe('cat-2');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skipping corrupt document [cat-corrupt]'),
        expect.anything(),
      );

      warnSpy.mockRestore();
    });
  });
});
