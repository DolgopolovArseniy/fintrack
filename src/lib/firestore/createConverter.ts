import type { z } from 'zod';
import type {
  DocumentData,
  FirestoreDataConverter,
  PartialWithFieldValue,
  QueryDocumentSnapshot,
  QuerySnapshot,
  SnapshotOptions,
  WithFieldValue,
} from 'firebase/firestore';
import { logger } from '@/lib/logger';

/**
 * Internal error thrown when a Firestore document fails validation.
 * Not exposed directly to the user as an AppError.
 */
export class InvalidDocumentError extends Error {
  public readonly docId: string;
  public readonly validationError?: unknown;

  constructor(docId: string, message: string, validationError?: unknown) {
    super(`Invalid document [${docId}]: ${message}`);
    this.name = 'InvalidDocumentError';
    this.docId = docId;
    this.validationError = validationError;
    Object.setPrototypeOf(this, InvalidDocumentError.prototype);
  }
}

export interface FirestoreTimestampLike {
  toDate: () => Date;
}

/**
 * Duck-typing check for Firestore Timestamp instances (native or stubs).
 */
export function isFirestoreTimestamp(
  value: unknown,
): value is FirestoreTimestampLike {
  return (
    value !== null &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  );
}

/**
 * Mapped type that recursively replaces FirestoreTimestampLike types with Date.
 */
export type ReplaceTimestamps<T> = T extends FirestoreTimestampLike
  ? Date
  : T extends Date
    ? Date
    : T extends (infer U)[]
      ? ReplaceTimestamps<U>[]
      : T extends object
        ? { [K in keyof T]: ReplaceTimestamps<T[K]> }
        : T;

/**
 * Recursively converts Firestore Timestamp instances to native JavaScript Date objects.
 * Preserves existing Date instances, arrays, primitives, and nullish values.
 */
export function convertTimestamps<T>(value: T): ReplaceTimestamps<T> {
  if (value === null || value === undefined) {
    return value as ReplaceTimestamps<T>;
  }

  if (isFirestoreTimestamp(value)) {
    return value.toDate() as ReplaceTimestamps<T>;
  }

  if (value instanceof Date) {
    return value as ReplaceTimestamps<T>;
  }

  if (Array.isArray(value)) {
    return value.map((item: unknown) =>
      convertTimestamps(item),
    ) as ReplaceTimestamps<T>;
  }

  if (typeof value === 'object' && value.constructor === Object) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = convertTimestamps(val);
    }
    return result as ReplaceTimestamps<T>;
  }

  return value as ReplaceTimestamps<T>;
}

/**
 * Factory for creating a type-safe FirestoreDataConverter from a Zod schema.
 * - fromFirestore: converts server timestamps with 'estimate', transforms Timestamps to Dates,
 *   injects the document id, and parses using the schema.
 * - toFirestore: pass-through payload that automatically strips the `id` field to maintain
 *   compatibility with strict Firestore Security Rules.
 */
export function createConverter<S extends z.ZodType>(
  schema: S,
): FirestoreDataConverter<z.infer<S>> {
  return {
    toFirestore(
      modelObject:
        WithFieldValue<z.infer<S>> | PartialWithFieldValue<z.infer<S>>,
    ): DocumentData {
      if (modelObject && typeof modelObject === 'object') {
        const rest: Record<string, unknown> = { ...modelObject };
        delete rest.id;
        return rest;
      }
      return modelObject ?? {};
    },

    fromFirestore(
      snapshot: QueryDocumentSnapshot<DocumentData, DocumentData>,
      options?: SnapshotOptions,
    ): z.infer<S> {
      const rawData = snapshot.data({
        serverTimestamps: 'estimate',
        ...options,
      });

      if (!rawData) {
        throw new InvalidDocumentError(
          snapshot.id,
          'Document data is undefined or missing',
        );
      }

      const convertedData = convertTimestamps({
        ...rawData,
        id: snapshot.id,
      });

      const parseResult = schema.safeParse(convertedData);
      if (!parseResult.success) {
        throw new InvalidDocumentError(
          snapshot.id,
          parseResult.error.message,
          parseResult.error,
        );
      }

      return parseResult.data;
    },
  };
}

/**
 * Parses all documents in a QuerySnapshot using the provided schema.
 * Skips corrupt or invalid documents and reports warnings via logger.warn without failing the whole list.
 */
export function parseSnapshotDocs<T>(
  snapshot: QuerySnapshot<unknown, DocumentData>,
  schema: z.ZodType<T>,
): T[] {
  const converter = createConverter(schema);
  const items: T[] = [];

  for (const docSnapshot of snapshot.docs) {
    try {
      const parsedItem = converter.fromFirestore(
        docSnapshot as QueryDocumentSnapshot<DocumentData, DocumentData>,
      );
      items.push(parsedItem);
    } catch (error) {
      if (error instanceof InvalidDocumentError) {
        logger.warn(
          `Skipping corrupt document [${docSnapshot.id}]: validation failed`,
          error.validationError,
        );
      } else {
        logger.warn(
          `Skipping corrupt document [${docSnapshot.id}]: unexpected error during parsing`,
          error,
        );
      }
    }
  }

  return items;
}
