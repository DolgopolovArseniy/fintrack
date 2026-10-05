import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { toAppError, type AppError } from '@/lib/errors';
import { parseSnapshotDocs } from '@/lib/firestore/createConverter';
import { accountsCol } from '@/lib/firestore/paths';
import {
  accountInputSchema,
  accountSchema,
  type Account,
  type AccountInput,
} from './schemas';

export type Unsubscribe = () => void;

/**
 * Subscribes to the user's accounts collection in real time.
 * Corrupt or invalid documents are safely skipped and logged without breaking the list.
 */
export function subscribeAccounts(
  uid: string,
  onData: (accounts: Account[]) => void,
  onError: (error: AppError) => void,
): Unsubscribe {
  try {
    const colRef = accountsCol(uid);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const accounts = parseSnapshotDocs(snapshot, accountSchema);
        onData(accounts);
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
 * Creates a new user account document.
 * Returns the generated account document ID.
 */
export async function createAccount(
  uid: string,
  input: AccountInput,
): Promise<string> {
  try {
    const validated = accountInputSchema.parse(input);
    const colRef = accountsCol(uid);
    const newDocRef = doc(colRef);

    const data: Record<string, unknown> = {
      type: validated.type,
      initialBalance: validated.initialBalance,
      balance: validated.balance ?? validated.initialBalance,
      archived: validated.archived,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (validated.name && validated.name.trim().length > 0) {
      data.name = validated.name.trim();
    }
    if (validated.systemKey && validated.systemKey.trim().length > 0) {
      data.systemKey = validated.systemKey.trim();
    }

    await setDoc(newDocRef, data);
    return newDocRef.id;
  } catch (error) {
    throw toAppError(error);
  }
}
