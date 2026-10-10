import {
  deleteField,
  doc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toAppError, type AppError } from '@/lib/errors';
import { parseSnapshotDocs } from '@/lib/firestore/createConverter';
import {
  accountDoc,
  transactionDoc,
  transactionsCol,
} from '@/lib/firestore/paths';
import { balanceDeltas } from '@/lib/balance';
import {
  compareIsoDates,
  isValidYearMonth,
  monthRange,
  type IsoDate,
  type YearMonth,
} from '@/lib/dates';
import {
  transactionInputSchema,
  transactionSchema,
  type Transaction,
  type TransactionInput,
} from './schemas';

export type Unsubscribe = () => void;

export interface TransactionUpdateInput {
  type?: Transaction['type'];
  amount?: number;
  accountId?: string;
  categoryId?: string;
  date?: string;
  note?: string;
  tags?: string[];
}

/**
 * In-memory map preserving original creation timestamps for restored transactions (Undo action).
 * Firestore rules require serverTimestamp() on document creation, but the client preserves
 * the original position in the list by mapping the restored ID to its original createdAt date.
 */
const restoredCreatedAtMap = new Map<string, Date>();

const ISO_DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Subscribes to the user's transactions within an arbitrary ISO date range [startDate, endDate] inclusive.
 * Ordered by date descending, then createdAt descending.
 * Corrupt documents are skipped with a warning via parseSnapshotDocs.
 */
export function subscribeTransactionsByDateRange(
  uid: string,
  startDate: IsoDate,
  endDate: IsoDate,
  onData: (transactions: Transaction[]) => void,
  onError: (error: AppError) => void,
): Unsubscribe {
  try {
    if (!ISO_DATE_PATTERN.test(startDate)) {
      throw new Error(
        `Invalid startDate: expected YYYY-MM-DD, got "${startDate}"`,
      );
    }
    if (!ISO_DATE_PATTERN.test(endDate)) {
      throw new Error(`Invalid endDate: expected YYYY-MM-DD, got "${endDate}"`);
    }
    if (compareIsoDates(startDate, endDate) > 0) {
      throw new Error(
        `Invalid date range: startDate "${startDate}" must be <= endDate "${endDate}"`,
      );
    }

    const colRef = transactionsCol(uid);
    const q = query(
      colRef,
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc'),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const parsedTxs = parseSnapshotDocs(snapshot, transactionSchema);
        const transactions = parsedTxs.map((t) => {
          const originalCreatedAt = restoredCreatedAtMap.get(t.id);
          if (originalCreatedAt) {
            return { ...t, createdAt: originalCreatedAt };
          }
          return t;
        });

        // Secondary sort within the same date by creation time descending
        transactions.sort((a, b) => {
          const dateComp = compareIsoDates(b.date, a.date);
          if (dateComp !== 0) {
            return dateComp;
          }
          return b.createdAt.getTime() - a.createdAt.getTime();
        });
        onData(transactions);
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
 * Fetches transactions within an arbitrary ISO date range [startDate, endDate] inclusive
 * as a one-time snapshot without maintaining a real-time listener.
 * Results are ordered chronologically descending (date descending, then createdAt descending).
 * Corrupt documents are skipped with a warning via parseSnapshotDocs.
 */
export async function getTransactionsByDateRange(
  uid: string,
  startDate: IsoDate,
  endDate: IsoDate,
): Promise<Transaction[]> {
  try {
    if (!ISO_DATE_PATTERN.test(startDate)) {
      throw new Error(
        `Invalid startDate: expected YYYY-MM-DD, got "${startDate}"`,
      );
    }
    if (!ISO_DATE_PATTERN.test(endDate)) {
      throw new Error(`Invalid endDate: expected YYYY-MM-DD, got "${endDate}"`);
    }
    if (compareIsoDates(startDate, endDate) > 0) {
      throw new Error(
        `Invalid date range: startDate "${startDate}" must be <= endDate "${endDate}"`,
      );
    }

    const colRef = transactionsCol(uid);
    const q = query(
      colRef,
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc'),
    );
    const snapshot = await getDocs(q);
    const transactions = parseSnapshotDocs(snapshot, transactionSchema);

    // Secondary sort within same date by creation time descending
    transactions.sort((a, b) => {
      const dateComp = compareIsoDates(b.date, a.date);
      if (dateComp !== 0) {
        return dateComp;
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return transactions;
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * Subscribes to the user's transactions within a specific calendar month in real time.
 * Results are ordered chronologically descending (newest dates and newest creations first).
 * Corrupt documents are skipped with a warning via parseSnapshotDocs.
 */
export function subscribeTransactionsByMonth(
  uid: string,
  month: YearMonth,
  onData: (transactions: Transaction[]) => void,
  onError: (error: AppError) => void,
): Unsubscribe {
  if (!isValidYearMonth(month)) {
    onError(
      toAppError(new Error(`Invalid month: expected YYYY-MM, got "${month}"`)),
    );
    return () => {};
  }

  const { start, end } = monthRange(month);
  return subscribeTransactionsByDateRange(uid, start, end, onData, onError);
}

/**
 * Creates a new transaction and atomically adjusts the affected account balance
 * in a single Firestore writeBatch.
 * Returns the generated transaction ID.
 */
export async function createTransaction(
  uid: string,
  input: TransactionInput,
): Promise<string> {
  try {
    const validated = transactionInputSchema.parse(input);
    const newDocRef = doc(transactionsCol(uid));
    const deltas = balanceDeltas(null, validated);

    const data: Record<string, unknown> = {
      type: validated.type,
      amount: validated.amount,
      accountId: validated.accountId,
      categoryId: validated.categoryId,
      date: validated.date,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (validated.note && validated.note.trim().length > 0) {
      data.note = validated.note.trim();
    }
    if (validated.tags && validated.tags.length > 0) {
      data.tags = validated.tags;
    }

    const batch = writeBatch(db);
    batch.set(newDocRef, data);

    for (const [accountId, delta] of deltas) {
      const accRef = accountDoc(uid, accountId);
      batch.update(accRef, {
        balance: increment(delta),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return newDocRef.id;
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * Updates an existing transaction and atomically synchronizes account balance(s)
 * via balanceDeltas in a single Firestore writeBatch.
 */
export async function updateTransaction(
  uid: string,
  txId: string,
  currentTx: Transaction,
  input: TransactionUpdateInput,
): Promise<void> {
  try {
    const rawNote =
      input.note !== undefined
        ? input.note.trim().length > 0
          ? input.note.trim()
          : undefined
        : currentTx.note;

    const rawTags =
      input.tags !== undefined
        ? input.tags.length > 0
          ? input.tags
          : undefined
        : currentTx.tags;

    const nextTxInput = transactionInputSchema.parse({
      type: input.type ?? currentTx.type,
      amount: input.amount ?? currentTx.amount,
      accountId: input.accountId ?? currentTx.accountId,
      categoryId: input.categoryId ?? currentTx.categoryId,
      date: input.date ?? currentTx.date,
      note: rawNote,
      tags: rawTags,
    });

    const deltas = balanceDeltas(currentTx, nextTxInput);

    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (input.type !== undefined) {
      payload.type = nextTxInput.type;
    }
    if (input.amount !== undefined) {
      payload.amount = nextTxInput.amount;
    }
    if (input.accountId !== undefined) {
      payload.accountId = nextTxInput.accountId;
    }
    if (input.categoryId !== undefined) {
      payload.categoryId = nextTxInput.categoryId;
    }
    if (input.date !== undefined) {
      payload.date = nextTxInput.date;
    }
    if (input.note !== undefined) {
      payload.note =
        input.note.trim().length > 0 ? input.note.trim() : deleteField();
    }
    if (input.tags !== undefined) {
      payload.tags = input.tags.length > 0 ? input.tags : deleteField();
    }

    const batch = writeBatch(db);
    const txRef = transactionDoc(uid, txId);
    batch.update(txRef, payload);

    for (const [accountId, delta] of deltas) {
      const accRef = accountDoc(uid, accountId);
      batch.update(accRef, {
        balance: increment(delta),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * Deletes a transaction and atomically reverts its amount from the account balance
 * in a single Firestore writeBatch.
 */
export async function deleteTransaction(
  uid: string,
  tx: Transaction,
): Promise<void> {
  try {
    const deltas = balanceDeltas(tx, null);
    const batch = writeBatch(db);
    const txRef = transactionDoc(uid, tx.id);
    batch.delete(txRef);

    for (const [accountId, delta] of deltas) {
      const accRef = accountDoc(uid, accountId);
      batch.update(accRef, {
        balance: increment(delta),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * Restores a previously deleted transaction (Undo action) with its original ID
 * and atomically restores its impact on the account balance in a single Firestore writeBatch.
 */
export async function restoreTransaction(
  uid: string,
  tx: Transaction,
): Promise<void> {
  try {
    const deltas = balanceDeltas(null, tx);
    const batch = writeBatch(db);
    const txRef = transactionDoc(uid, tx.id);

    if (tx.createdAt instanceof Date) {
      restoredCreatedAtMap.set(tx.id, tx.createdAt);
    }

    const data: Record<string, unknown> = {
      type: tx.type,
      amount: tx.amount,
      accountId: tx.accountId,
      categoryId: tx.categoryId,
      date: tx.date,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (tx.note && tx.note.trim().length > 0) {
      data.note = tx.note.trim();
    }
    if (tx.tags && tx.tags.length > 0) {
      data.tags = tx.tags;
    }

    batch.set(txRef, data);

    for (const [accountId, delta] of deltas) {
      const accRef = accountDoc(uid, accountId);
      batch.update(accRef, {
        balance: increment(delta),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    throw toAppError(error);
  }
}
