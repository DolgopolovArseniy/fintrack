import { clearIndexedDbPersistence, terminate } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logger } from '@/lib/logger';

/**
 * Best effort: terminates Firestore and clears local IndexedDB persistence cache.
 * Errors (such as concurrent tabs or unsaved mutations) are caught and logged
 * without aborting user sign-out. See ADR-0015 and F02 §9.6.
 */
export async function clearLocalFirestoreData(): Promise<void> {
  try {
    await terminate(db);
    await clearIndexedDbPersistence(db);
  } catch (error) {
    logger.warn('Failed to clear local Firestore cache', error);
  }
}
