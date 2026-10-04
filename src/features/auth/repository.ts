import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toAppError, type AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { accountDoc, categoriesCol, userDoc } from '@/lib/firestore/paths';
import { DEFAULT_CATEGORIES } from '@/features/categories';
import { userProfileConverter } from './converters';
import type { OnboardingInput } from './types';
import type { UserProfile } from './schemas';

export type Unsubscribe = () => void;

/**
 * Checks whether the user profile document exists in Firestore.
 */
export async function checkProfileDocExists(uid: string): Promise<boolean> {
  try {
    const ref = userDoc(uid);
    const snap = await getDoc(ref);
    return snap.exists();
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * Reads the user profile document from Firestore.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const ref = userDoc(uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return null;
    }
    return userProfileConverter.fromFirestore(snap);
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * Subscribes to the user profile document in real-time.
 */
export function subscribeUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void,
  onError: (error: AppError) => void,
): Unsubscribe {
  try {
    const ref = userDoc(uid);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (!snapshot.exists()) {
          onData(null);
          return;
        }

        try {
          const profile = userProfileConverter.fromFirestore(snapshot);
          onData(profile);
        } catch (error) {
          logger.warn(`Failed to parse profile for user [${uid}]`, error);
          onData(null);
        }
      },
      (error) => {
        onError(toAppError(error));
      },
    );
    return unsubscribe;
  } catch (error) {
    onError(toAppError(error));
    return () => {};
  }
}

/**
 * Executes atomic batch write initializing:
 * 1. User profile (users/{uid})
 * 2. Default main account (users/{uid}/accounts/main)
 * 3. 11 default categories (8 expenses, 3 incomes)
 */
export async function createOnboardingBatch(
  uid: string,
  input: OnboardingInput,
): Promise<void> {
  try {
    const batch = writeBatch(db);

    // 1. Profile document
    const profileRef = userDoc(uid);
    const profileData: Record<string, unknown> = {
      baseCurrency: input.baseCurrency,
      locale: input.locale,
      theme: input.theme,
      schemaVersion: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const trimmedDisplayName = input.displayName?.trim();
    if (trimmedDisplayName && trimmedDisplayName.length > 0) {
      profileData.displayName = trimmedDisplayName;
    }
    batch.set(profileRef, profileData);

    // 2. Default main account
    const mainAccountRef = accountDoc(uid, 'main');
    batch.set(mainAccountRef, {
      type: 'cash',
      balance: 0,
      initialBalance: 0,
      archived: false,
      systemKey: 'main',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 3. 11 default categories
    for (const cat of DEFAULT_CATEGORIES) {
      const categoryRef = doc(categoriesCol(uid));
      batch.set(categoryRef, {
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        archived: false,
        systemKey: cat.systemKey,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    throw toAppError(error);
  }
}
