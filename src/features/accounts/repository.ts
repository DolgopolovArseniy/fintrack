import {
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toAppError, type AppError } from '@/lib/errors';
import { parseSnapshotDocs } from '@/lib/firestore/createConverter';
import {
  accountDoc,
  accountsCol,
  transactionsCol,
} from '@/lib/firestore/paths';
import { signedAmount } from '@/lib/money';
import { transactionSchema } from '@/features/transactions';
import {
  accountInputSchema,
  accountSchema,
  accountUpdateInputSchema,
  type Account,
  type AccountInput,
  type AccountUpdateInput,
} from './schemas';
import { accountConverter } from './converters';

export type Unsubscribe = () => void;

export interface RecalculateBalanceResult {
  previousBalance: number;
  newBalance: number;
  delta: number;
  transactionCount: number;
}

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

/**
 * Updates existing account fields with atomic balance adjustment when initialBalance is modified.
 */
export async function updateAccount(
  uid: string,
  accountId: string,
  currentAccount: Account,
  input: AccountUpdateInput,
): Promise<void> {
  try {
    const validated = accountUpdateInputSchema.parse(input);
    const accRef = accountDoc(uid, accountId);
    const batch = writeBatch(db);

    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (validated.name !== undefined) {
      const trimmed = validated.name.trim();
      if (trimmed.length > 0) {
        payload.name = trimmed;
      } else {
        payload.name = deleteField();
      }
    }

    if (validated.type !== undefined) {
      payload.type = validated.type;
    }

    if (validated.initialBalance !== undefined) {
      payload.initialBalance = validated.initialBalance;
      const initialDelta =
        validated.initialBalance - currentAccount.initialBalance;
      if (initialDelta !== 0) {
        payload.balance = increment(initialDelta);
      }
    }

    if (validated.archived !== undefined) {
      payload.archived = validated.archived;
    }

    batch.update(accRef, payload);
    await batch.commit();
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * Soft-deletes (archives) an account by setting archived: true.
 */
export async function archiveAccount(
  uid: string,
  accountId: string,
): Promise<void> {
  try {
    const ref = accountDoc(uid, accountId);
    await updateDoc(ref, {
      archived: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * Restores an archived account by setting archived: false.
 */
export async function unarchiveAccount(
  uid: string,
  accountId: string,
): Promise<void> {
  try {
    const ref = accountDoc(uid, accountId);
    await updateDoc(ref, {
      archived: false,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * Recalculates the account balance based on its initial balance and all transaction history.
 */
export async function recalculateAccountBalance(
  uid: string,
  accountId: string,
): Promise<RecalculateBalanceResult> {
  try {
    const accRef = doc(accountsCol(uid), accountId).withConverter(
      accountConverter,
    );
    const accSnap = await getDoc(accRef);
    const account = accSnap.data();

    if (!accSnap.exists() || !account) {
      throw new Error(`Account not found [${accountId}]`);
    }

    const q = query(transactionsCol(uid), where('accountId', '==', accountId));
    const txSnap = await getDocs(q);
    const transactions = parseSnapshotDocs(txSnap, transactionSchema);

    let sumTransactions = 0;
    for (const tx of transactions) {
      sumTransactions += signedAmount(tx.type, tx.amount);
    }

    const previousBalance = account.balance;
    const newBalance = account.initialBalance + sumTransactions;
    const delta = newBalance - previousBalance;
    const transactionCount = transactions.length;

    await updateDoc(accountDoc(uid, accountId), {
      balance: newBalance,
      updatedAt: serverTimestamp(),
    });

    return {
      previousBalance,
      newBalance,
      delta,
      transactionCount,
    };
  } catch (error) {
    throw toAppError(error);
  }
}
