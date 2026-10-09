import {
  type CollectionReference,
  type FirestoreDataConverter,
} from 'firebase/firestore';
import { createConverter } from '@/lib/firestore/createConverter';
import { budgetsCol } from '@/lib/firestore/paths';
import { budgetSchema, type Budget } from './schemas';

export const budgetConverter: FirestoreDataConverter<Budget> =
  createConverter(budgetSchema);

/**
 * Returns a typed CollectionReference for a user's budgets collection.
 */
export function budgetsCollectionRef(uid: string): CollectionReference<Budget> {
  return budgetsCol(uid).withConverter(budgetConverter);
}
