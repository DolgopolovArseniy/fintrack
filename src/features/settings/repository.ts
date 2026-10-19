import {
  deleteDoc,
  deleteField,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type CollectionReference,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  accountsCol,
  budgetsCol,
  categoriesCol,
  transactionsCol,
  userDoc,
} from '@/lib/firestore/paths';
import { accountsCollectionRef } from '@/features/accounts';
import { categoriesCollectionRef } from '@/features/categories';
import { budgetsCollectionRef } from '@/features/budgets';
import { transactionsCollectionRef } from '@/features/transactions';
import {
  getCurrentAuthUser,
  userProfileConverter,
  type Theme,
} from '@/features/auth';
import type { CurrencyCode } from '@/lib/currencies';
import type { Locale } from '@/lib/locales';
import { AppError, toAppError } from '@/lib/errors';
import {
  buildFullUserDataDump,
  type FullUserDataDump,
} from './utils/exportJson';

export interface UpdateProfileInput {
  displayName?: string;
  baseCurrency?: CurrencyCode;
  locale?: Locale;
  theme?: Theme;
}

export type DeletionPhase =
  | 'reauth'
  | 'transactions'
  | 'budgets'
  | 'accounts'
  | 'categories'
  | 'profile'
  | 'auth'
  | 'done';

export interface DeletionProgress {
  phase: DeletionPhase;
  deletedItems: number;
  totalItems?: number;
}

export const DELETION_CHUNK_SIZE = 400;

/**
 * Updates user profile fields in users/{uid}.
 * Enforces serverTimestamp() on updatedAt and handles displayName deletion via deleteField().
 */
export async function updateUserProfile(
  uid: string,
  input: UpdateProfileInput,
): Promise<void> {
  try {
    const ref = userDoc(uid);
    const updateData: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (input.baseCurrency !== undefined) {
      updateData.baseCurrency = input.baseCurrency;
    }
    if (input.locale !== undefined) {
      updateData.locale = input.locale;
    }
    if (input.theme !== undefined) {
      updateData.theme = input.theme;
    }
    if (input.displayName !== undefined) {
      const trimmed = input.displayName.trim();
      updateData.displayName = trimmed.length > 0 ? trimmed : deleteField();
    }

    await updateDoc(ref, updateData);
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * Fetches all user data across all subcollections for structured JSON export.
 */
export async function fetchAllUserData(uid: string): Promise<FullUserDataDump> {
  try {
    const profileRef = userDoc(uid).withConverter(userProfileConverter);

    const [
      profileSnap,
      accountsSnap,
      categoriesSnap,
      budgetsSnap,
      transactionsSnap,
    ] = await Promise.all([
      getDoc(profileRef),
      getDocs(accountsCollectionRef(uid)),
      getDocs(categoriesCollectionRef(uid)),
      getDocs(budgetsCollectionRef(uid)),
      getDocs(transactionsCollectionRef(uid)),
    ]);

    if (!profileSnap.exists()) {
      throw new AppError('not-found', `User profile [${uid}] not found`);
    }

    const profileData = profileSnap.data();
    const currentAuthUser = getCurrentAuthUser();
    const email = currentAuthUser?.uid === uid ? currentAuthUser.email : null;

    return buildFullUserDataDump({
      profile: {
        uid,
        email,
        displayName: profileData.displayName ?? null,
        baseCurrency: profileData.baseCurrency,
        locale: profileData.locale,
        theme: profileData.theme,
        createdAt: profileData.createdAt,
        updatedAt: profileData.updatedAt,
      },
      accounts: accountsSnap.docs.map((d) => d.data()),
      categories: categoriesSnap.docs.map((d) => d.data()),
      budgets: budgetsSnap.docs.map((d) => d.data()),
      transactions: transactionsSnap.docs.map((d) => d.data()),
    });
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * Deletes all documents in a subcollection in batches of up to 400 documents,
 * emitting progress updates.
 */
async function deleteCollectionInChunks(
  colRef: CollectionReference,
  phase: DeletionPhase,
  chunkSize: number = DELETION_CHUNK_SIZE,
  onProgress?: (progress: DeletionProgress) => void,
): Promise<number> {
  const snapshot = await getDocs(colRef);
  const total = snapshot.docs.length;
  if (total === 0) {
    onProgress?.({ phase, deletedItems: 0, totalItems: 0 });
    return 0;
  }

  let deleted = 0;
  onProgress?.({ phase, deletedItems: 0, totalItems: total });

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = snapshot.docs.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const docSnap of chunk) {
      batch.delete(docSnap.ref);
    }
    await batch.commit();
    deleted += chunk.length;
    onProgress?.({ phase, deletedItems: deleted, totalItems: total });
  }

  return deleted;
}

/**
 * Deletes all user documents in batches of 400 across all 4 subcollections,
 * then deletes the user profile document users/{uid}.
 */
export async function deleteAllUserFirestoreData(
  uid: string,
  onProgress?: (progress: DeletionProgress) => void,
): Promise<void> {
  try {
    // 1. Transactions
    await deleteCollectionInChunks(
      transactionsCol(uid),
      'transactions',
      DELETION_CHUNK_SIZE,
      onProgress,
    );

    // 2. Budgets
    await deleteCollectionInChunks(
      budgetsCol(uid),
      'budgets',
      DELETION_CHUNK_SIZE,
      onProgress,
    );

    // 3. Accounts
    await deleteCollectionInChunks(
      accountsCol(uid),
      'accounts',
      DELETION_CHUNK_SIZE,
      onProgress,
    );

    // 4. Categories
    await deleteCollectionInChunks(
      categoriesCol(uid),
      'categories',
      DELETION_CHUNK_SIZE,
      onProgress,
    );

    // 5. User profile document
    onProgress?.({ phase: 'profile', deletedItems: 0, totalItems: 1 });
    await deleteDoc(userDoc(uid));
    onProgress?.({ phase: 'profile', deletedItems: 1, totalItems: 1 });

    // 6. Firestore deletion complete
    onProgress?.({ phase: 'done', deletedItems: 1, totalItems: 1 });
  } catch (error) {
    throw toAppError(error);
  }
}

export type { FullUserDataDump };
