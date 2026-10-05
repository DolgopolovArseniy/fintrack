import {
  type CollectionReference,
  type FirestoreDataConverter,
} from 'firebase/firestore';
import { createConverter } from '@/lib/firestore/createConverter';
import { transactionsCol } from '@/lib/firestore/paths';
import { transactionSchema, type Transaction } from './schemas';

export const transactionConverter: FirestoreDataConverter<Transaction> =
  createConverter(transactionSchema);

/**
 * Returns a typed CollectionReference for a user's transactions collection.
 */
export function transactionsCollectionRef(
  uid: string,
): CollectionReference<Transaction> {
  return transactionsCol(uid).withConverter(transactionConverter);
}
