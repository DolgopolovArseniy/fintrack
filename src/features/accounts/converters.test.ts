import { describe, expect, it, vi } from 'vitest';
import { logger } from '@/lib/logger';
import { parseSnapshotDocs } from '@/lib/firestore/createConverter';
import { accountConverter, accountsCollectionRef } from './converters';
import { accountSchema, type Account } from './schemas';

type DocSnapshot = Parameters<typeof accountConverter.fromFirestore>[0];
type QuerySnapshotLike = Parameters<typeof parseSnapshotDocs>[0];

describe('accounts converters', () => {
  const mockDate = new Date('2026-05-15T12:00:00.000Z');
  const mockTimestamp = {
    toDate: () => mockDate,
  };

  describe('accountConverter', () => {
    describe('toFirestore', () => {
      it('strips the id field when converting to Firestore document data', () => {
        const account: Account = {
          id: 'acc-123',
          type: 'card',
          name: 'Main Card',
          balance: 15000,
          initialBalance: 15000,
          archived: false,
          createdAt: mockDate,
          updatedAt: mockDate,
        };

        const firestoreData = accountConverter.toFirestore(account);

        expect(firestoreData).not.toHaveProperty('id');
        expect(firestoreData).toEqual({
          type: 'card',
          name: 'Main Card',
          balance: 15000,
          initialBalance: 15000,
          archived: false,
          createdAt: mockDate,
          updatedAt: mockDate,
        });
      });
    });

    describe('fromFirestore', () => {
      it('converts Firestore timestamps to Dates and attaches snapshot id', () => {
        const mockSnapshot = {
          id: 'acc-456',
          data: vi.fn().mockReturnValue({
            type: 'cash',
            systemKey: 'main',
            balance: 5000,
            initialBalance: 5000,
            archived: false,
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          }),
        } as unknown as DocSnapshot;

        const account = accountConverter.fromFirestore(mockSnapshot);

        expect(account).toEqual({
          id: 'acc-456',
          type: 'cash',
          systemKey: 'main',
          balance: 5000,
          initialBalance: 5000,
          archived: false,
          createdAt: mockDate,
          updatedAt: mockDate,
        });
      });

      it('throws InvalidDocumentError when document data is corrupt or fails validation', () => {
        const corruptSnapshot = {
          id: 'bad-acc',
          data: vi.fn().mockReturnValue({
            type: 'invalid-type',
            balance: 'not-a-number',
            archived: false,
            createdAt: mockTimestamp,
            updatedAt: mockTimestamp,
          }),
        } as unknown as DocSnapshot;

        expect(() =>
          accountConverter.fromFirestore(corruptSnapshot),
        ).toThrowError(/Invalid document \[bad-acc\]/);
      });
    });
  });

  describe('accountsCollectionRef', () => {
    it('creates a collection reference with converter attached', () => {
      const ref = accountsCollectionRef('user-xyz');
      expect(ref).toBeDefined();
      expect(ref.converter).toBe(accountConverter);
    });
  });

  describe('parseSnapshotDocs with accountSchema', () => {
    it('skips corrupt documents with warning and returns valid accounts', () => {
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

      const validDoc1 = {
        id: 'acc-1',
        data: () => ({
          type: 'card',
          name: 'Debit Card',
          balance: 20000,
          initialBalance: 20000,
          archived: false,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        }),
      };

      const corruptDoc = {
        id: 'acc-corrupt',
        data: () => ({
          type: 'unknown',
        }),
      };

      const validDoc2 = {
        id: 'acc-2',
        data: () => ({
          type: 'cash',
          systemKey: 'main',
          balance: 3000,
          initialBalance: 0,
          archived: false,
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
        }),
      };

      const snapshot = {
        docs: [validDoc1, corruptDoc, validDoc2],
      } as unknown as QuerySnapshotLike;

      const items = parseSnapshotDocs(snapshot, accountSchema);

      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe('acc-1');
      expect(items[1]?.id).toBe('acc-2');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Skipping corrupt document [acc-corrupt]'),
        expect.anything(),
      );

      warnSpy.mockRestore();
    });
  });
});
