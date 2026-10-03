import {
  setDoc,
  Timestamp,
  type WithFieldValue,
  type DocumentData,
} from 'firebase/firestore';
import { getTestEnv, docRef } from './env';

/**
 * Seeds a document bypassing Security Rules with real Timestamps.
 */
export async function seedDocument<T extends DocumentData = DocumentData>(
  docPath: string,
  data: WithFieldValue<T>,
): Promise<void> {
  const env = await getTestEnv();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(docRef(db, docPath), data);
  });
}

/**
 * Seeds multiple documents bypassing Security Rules.
 */
export async function seedDocuments(
  entries: Array<{ path: string; data: WithFieldValue<DocumentData> }>,
): Promise<void> {
  const env = await getTestEnv();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const entry of entries) {
      await setDoc(docRef(db, entry.path), entry.data);
    }
  });
}

/**
 * Helper to produce a real Firestore Timestamp for seeding existing documents.
 */
export function realTimestamp(date?: Date): Timestamp {
  return date ? Timestamp.fromDate(date) : Timestamp.now();
}
