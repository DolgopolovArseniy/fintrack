import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Validates that a string argument is non-empty and non-whitespace.
 */
function assertNonEmptyString(
  value: unknown,
  fieldName: string,
): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid ${fieldName}: must be a non-empty string`);
  }
}

/**
 * Returns a DocumentReference to users/{uid}
 */
export function userDoc(uid: string): DocumentReference {
  assertNonEmptyString(uid, 'uid');
  return doc(db, 'users', uid.trim());
}

/**
 * Returns a CollectionReference to users/{uid}/accounts
 */
export function accountsCol(uid: string): CollectionReference {
  assertNonEmptyString(uid, 'uid');
  return collection(db, 'users', uid.trim(), 'accounts');
}

/**
 * Returns a DocumentReference to users/{uid}/accounts/{accountId}
 */
export function accountDoc(uid: string, accountId: string): DocumentReference {
  assertNonEmptyString(uid, 'uid');
  assertNonEmptyString(accountId, 'accountId');
  return doc(db, 'users', uid.trim(), 'accounts', accountId.trim());
}

/**
 * Returns a CollectionReference to users/{uid}/categories
 */
export function categoriesCol(uid: string): CollectionReference {
  assertNonEmptyString(uid, 'uid');
  return collection(db, 'users', uid.trim(), 'categories');
}

/**
 * Returns a DocumentReference to users/{uid}/categories/{categoryId}
 */
export function categoryDoc(
  uid: string,
  categoryId: string,
): DocumentReference {
  assertNonEmptyString(uid, 'uid');
  assertNonEmptyString(categoryId, 'categoryId');
  return doc(db, 'users', uid.trim(), 'categories', categoryId.trim());
}

/**
 * Returns a CollectionReference to users/{uid}/transactions
 */
export function transactionsCol(uid: string): CollectionReference {
  assertNonEmptyString(uid, 'uid');
  return collection(db, 'users', uid.trim(), 'transactions');
}

/**
 * Returns a DocumentReference to users/{uid}/transactions/{txId}
 */
export function transactionDoc(uid: string, txId: string): DocumentReference {
  assertNonEmptyString(uid, 'uid');
  assertNonEmptyString(txId, 'txId');
  return doc(db, 'users', uid.trim(), 'transactions', txId.trim());
}

/**
 * Returns a CollectionReference to users/{uid}/budgets
 */
export function budgetsCol(uid: string): CollectionReference {
  assertNonEmptyString(uid, 'uid');
  return collection(db, 'users', uid.trim(), 'budgets');
}

/**
 * Returns a DocumentReference to users/{uid}/budgets/{budgetId}
 */
export function budgetDoc(uid: string, budgetId: string): DocumentReference {
  assertNonEmptyString(uid, 'uid');
  assertNonEmptyString(budgetId, 'budgetId');
  return doc(db, 'users', uid.trim(), 'budgets', budgetId.trim());
}
