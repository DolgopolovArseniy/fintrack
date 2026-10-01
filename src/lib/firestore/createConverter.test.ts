import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import type {
  DocumentData,
  PartialWithFieldValue,
  QueryDocumentSnapshot,
  QuerySnapshot,
  SnapshotOptions,
} from 'firebase/firestore';
import { logger } from '@/lib/logger';
import {
  convertTimestamps,
  createConverter,
  InvalidDocumentError,
  parseSnapshotDocs,
} from './createConverter';

// Helper to create a fake Timestamp-like object
function fakeTimestamp(date: Date) {
  return {
    toDate: () => date,
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: (date.getTime() % 1000) * 1e6,
  };
}

// Helper to create a fake QueryDocumentSnapshot
function createFakeDocSnapshot<T extends DocumentData>(
  id: string,
  data: T | undefined,
  capturedOptions?: { options?: SnapshotOptions },
): QueryDocumentSnapshot<DocumentData, DocumentData> {
  return {
    id,
    data: (options?: SnapshotOptions) => {
      if (capturedOptions) {
        capturedOptions.options = options;
      }
      return data;
    },
  } as unknown as QueryDocumentSnapshot<DocumentData, DocumentData>;
}

// Helper to create a fake QuerySnapshot
function createFakeQuerySnapshot(
  docs: Array<QueryDocumentSnapshot<DocumentData, DocumentData>>,
): QuerySnapshot<unknown, DocumentData> {
  return {
    docs,
    size: docs.length,
    empty: docs.length === 0,
  } as unknown as QuerySnapshot<unknown, DocumentData>;
}

const testItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  amount: z.number().int().positive(),
  createdAt: z.date(),
  updatedAt: z.date(),
  details: z
    .object({
      reviewedAt: z.date().optional(),
    })
    .optional(),
});

describe('createConverter & parseSnapshotDocs', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('convertTimestamps', () => {
    it('recursively converts Timestamps in objects, arrays, and nested structures', () => {
      const now = new Date('2026-09-30T12:00:00.000Z');
      const later = new Date('2026-10-01T12:00:00.000Z');

      const raw = {
        title: 'Test',
        count: 5,
        created: fakeTimestamp(now),
        tags: ['a', 'b'],
        nested: {
          updated: fakeTimestamp(later),
          alreadyDate: now,
          primitive: 123,
        },
        items: [{ ts: fakeTimestamp(now) }],
      };

      const converted = convertTimestamps(raw);

      expect(converted.created).toBeInstanceOf(Date);
      expect(converted.created.toISOString()).toBe(now.toISOString());
      expect(converted.nested.updated).toBeInstanceOf(Date);
      expect(converted.nested.updated.toISOString()).toBe(later.toISOString());
      expect(converted.nested.alreadyDate).toBe(now);
      expect(converted.items[0]?.ts).toBeInstanceOf(Date);
      expect(converted.title).toBe('Test');
      expect(converted.count).toBe(5);
    });

    it('returns null and undefined as-is', () => {
      expect(convertTimestamps(null)).toBeNull();
      expect(convertTimestamps(undefined)).toBeUndefined();
      expect(convertTimestamps(123)).toBe(123);
      expect(convertTimestamps('str')).toBe('str');
    });
  });

  describe('createConverter', () => {
    const converter = createConverter(testItemSchema);

    it('successfully converts valid snapshot: id injected, Timestamp -> Date, estimate options passed (AC8)', () => {
      const createdDate = new Date('2026-09-01T10:00:00.000Z');
      const updatedDate = new Date('2026-09-02T15:30:00.000Z');

      const captured: { options?: SnapshotOptions } = {};
      const fakeDoc = createFakeDocSnapshot(
        'doc-100',
        {
          name: 'Groceries',
          amount: 2500,
          createdAt: fakeTimestamp(createdDate),
          updatedAt: fakeTimestamp(updatedDate),
        },
        captured,
      );

      const result = converter.fromFirestore(fakeDoc);

      expect(captured.options).toEqual({ serverTimestamps: 'estimate' });
      expect(result.id).toBe('doc-100');
      expect(result.name).toBe('Groceries');
      expect(result.amount).toBe(2500);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.createdAt.toISOString()).toBe(createdDate.toISOString());
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.updatedAt.toISOString()).toBe(updatedDate.toISOString());
    });

    it('throws InvalidDocumentError if snapshot.data() returns undefined', () => {
      const fakeDoc = createFakeDocSnapshot('doc-empty', undefined);

      expect(() => converter.fromFirestore(fakeDoc)).toThrowError(
        InvalidDocumentError,
      );
      try {
        converter.fromFirestore(fakeDoc);
      } catch (err) {
        expect(err).toBeInstanceOf(InvalidDocumentError);
        expect((err as InvalidDocumentError).docId).toBe('doc-empty');
      }
    });

    it('throws InvalidDocumentError if validation fails (e.g. invalid amount)', () => {
      const fakeDoc = createFakeDocSnapshot('doc-invalid', {
        name: 'Invalid Item',
        amount: -50, // invalid: positive integer required
        createdAt: fakeTimestamp(new Date()),
        updatedAt: fakeTimestamp(new Date()),
      });

      expect(() => converter.fromFirestore(fakeDoc)).toThrowError(
        InvalidDocumentError,
      );
      try {
        converter.fromFirestore(fakeDoc);
      } catch (err) {
        const invErr = err as InvalidDocumentError;
        expect(invErr.docId).toBe('doc-invalid');
        expect(invErr.validationError).toBeDefined();
      }
    });

    it('toFirestore strips id from payload and passes remaining fields through', () => {
      const item = {
        id: 'doc-to-strip',
        name: 'Payroll',
        amount: 500000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const firestorePayload = converter.toFirestore(item);

      expect(firestorePayload).not.toHaveProperty('id');
      expect(firestorePayload.name).toBe('Payroll');
      expect(firestorePayload.amount).toBe(500000);
    });

    it('toFirestore handles payload without id safely', () => {
      const payload: PartialWithFieldValue<z.infer<typeof testItemSchema>> = {
        name: 'No ID',
        amount: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const firestorePayload = converter.toFirestore(payload, { merge: true });
      expect(firestorePayload.name).toBe('No ID');
      expect(firestorePayload.amount).toBe(100);
    });
  });

  describe('parseSnapshotDocs (AC8)', () => {
    it('parses array of valid documents', () => {
      const now = new Date();
      const docs = [
        createFakeDocSnapshot('doc-1', {
          name: 'Item 1',
          amount: 100,
          createdAt: fakeTimestamp(now),
          updatedAt: fakeTimestamp(now),
        }),
        createFakeDocSnapshot('doc-2', {
          name: 'Item 2',
          amount: 200,
          createdAt: fakeTimestamp(now),
          updatedAt: fakeTimestamp(now),
        }),
      ];
      const snapshot = createFakeQuerySnapshot(docs);

      const items = parseSnapshotDocs(snapshot, testItemSchema);

      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe('doc-1');
      expect(items[0]?.amount).toBe(100);
      expect(items[1]?.id).toBe('doc-2');
      expect(items[1]?.amount).toBe(200);
    });

    it('skips invalid documents and calls logger.warn without failing valid ones', () => {
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
      const now = new Date();

      const docs = [
        // Valid doc
        createFakeDocSnapshot('doc-valid-1', {
          name: 'Valid 1',
          amount: 100,
          createdAt: fakeTimestamp(now),
          updatedAt: fakeTimestamp(now),
        }),
        // Invalid doc: amount is not positive
        createFakeDocSnapshot('doc-corrupt', {
          name: 'Corrupt',
          amount: -999,
          createdAt: fakeTimestamp(now),
          updatedAt: fakeTimestamp(now),
        }),
        // Invalid doc: missing data
        createFakeDocSnapshot('doc-missing-data', undefined),
        // Valid doc
        createFakeDocSnapshot('doc-valid-2', {
          name: 'Valid 2',
          amount: 300,
          createdAt: fakeTimestamp(now),
          updatedAt: fakeTimestamp(now),
        }),
      ];
      const snapshot = createFakeQuerySnapshot(docs);

      const items = parseSnapshotDocs(snapshot, testItemSchema);

      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe('doc-valid-1');
      expect(items[1]?.id).toBe('doc-valid-2');

      expect(warnSpy).toHaveBeenCalledTimes(2);
      expect(warnSpy.mock.calls[0]?.[0]).toContain('doc-corrupt');
      expect(warnSpy.mock.calls[1]?.[0]).toContain('doc-missing-data');
    });

    it('returns an empty array when snapshot contains no documents', () => {
      const emptySnapshot = createFakeQuerySnapshot([]);
      const items = parseSnapshotDocs(emptySnapshot, testItemSchema);
      expect(items).toEqual([]);
    });
  });
});
