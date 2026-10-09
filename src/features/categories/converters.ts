import {
  type CollectionReference,
  type FirestoreDataConverter,
} from 'firebase/firestore';
import { createConverter } from '@/lib/firestore/createConverter';
import { categoriesCol } from '@/lib/firestore/paths';
import { categorySchema, type Category } from './schemas';

export const categoryConverter: FirestoreDataConverter<Category> =
  createConverter(categorySchema);

/**
 * Returns a typed CollectionReference for a user's categories collection.
 */
export function categoriesCollectionRef(
  uid: string,
): CollectionReference<Category> {
  return categoriesCol(uid).withConverter(categoryConverter);
}
