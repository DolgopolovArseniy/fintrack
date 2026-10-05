import {
  type CollectionReference,
  type FirestoreDataConverter,
} from 'firebase/firestore';
import { createConverter } from '@/lib/firestore/createConverter';
import { accountsCol } from '@/lib/firestore/paths';
import { accountSchema, type Account } from './schemas';

export const accountConverter: FirestoreDataConverter<Account> =
  createConverter(accountSchema);

/**
 * Returns a typed CollectionReference for a user's accounts collection.
 */
export function accountsCollectionRef(
  uid: string,
): CollectionReference<Account> {
  return accountsCol(uid).withConverter(accountConverter);
}
