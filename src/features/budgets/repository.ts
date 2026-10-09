import {
  deleteDoc,
  getDocs,
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
import { isValidYearMonth } from '@/lib/dates';
import { parseSnapshotDocs } from '@/lib/firestore/createConverter';
import { budgetDoc, budgetsCol } from '@/lib/firestore/paths';
import {
  budgetInputSchema,
  budgetSchema,
  budgetUpdateInputSchema,
  type Budget,
  type BudgetInput,
  type BudgetUpdateInput,
} from './schemas';
import { buildBudgetId } from './utils';

export type Unsubscribe = () => void;

export interface CopyBudgetsOptions {
  overwrite?: boolean;
}

export interface CopyBudgetsResult {
  copiedCount: number;
  skippedCount: number;
}

/**
 * Subscribes to real-time budget documents for a specific calendar month.
 * Corrupt or invalid documents are safely skipped and logged without breaking the list.
 */
export function subscribeBudgetsByMonth(
  uid: string,
  month: string,
  onData: (budgets: Budget[]) => void,
  onError: (error: AppError) => void,
): Unsubscribe {
  try {
    if (!isValidYearMonth(month)) {
      onError(
        toAppError(
          new Error(`Invalid month: expected YYYY-MM, got "${month}"`),
        ),
      );
      return () => {};
    }

    const colRef = budgetsCol(uid);
    const q = query(colRef, where('month', '==', month));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const budgets = parseSnapshotDocs(snapshot, budgetSchema);
        onData(budgets);
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
 * Creates a new category budget document with deterministic ID `${month}_${categoryId}`.
 * Returns the budget document ID.
 */
export async function createBudget(
  uid: string,
  input: BudgetInput,
): Promise<string> {
  try {
    const validated = budgetInputSchema.parse(input);
    const budgetId = buildBudgetId(validated.month, validated.categoryId);
    const ref = budgetDoc(uid, budgetId);

    const data: Record<string, unknown> = {
      categoryId: validated.categoryId,
      month: validated.month,
      limit: validated.limit,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(ref, data);
    return budgetId;
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * Updates the limit of an existing budget document.
 */
export async function updateBudget(
  uid: string,
  budgetId: string,
  input: BudgetUpdateInput,
): Promise<void> {
  try {
    const validated = budgetUpdateInputSchema.parse(input);
    const ref = budgetDoc(uid, budgetId);

    await updateDoc(ref, {
      limit: validated.limit,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * Deletes a budget document from Firestore.
 */
export async function deleteBudget(
  uid: string,
  budgetId: string,
): Promise<void> {
  try {
    const ref = budgetDoc(uid, budgetId);
    await deleteDoc(ref);
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * Copies all budget limits configured in `sourceMonth` to `targetMonth`.
 * If `options.overwrite` is false, skips categories that already have a budget in `targetMonth`.
 */
export async function copyBudgetsFromMonth(
  uid: string,
  sourceMonth: string,
  targetMonth: string,
  options?: CopyBudgetsOptions,
): Promise<CopyBudgetsResult> {
  try {
    if (!isValidYearMonth(sourceMonth)) {
      throw new Error(
        `Invalid sourceMonth: expected YYYY-MM, got "${sourceMonth}"`,
      );
    }
    if (!isValidYearMonth(targetMonth)) {
      throw new Error(
        `Invalid targetMonth: expected YYYY-MM, got "${targetMonth}"`,
      );
    }

    const sourceQuery = query(
      budgetsCol(uid),
      where('month', '==', sourceMonth),
    );
    const sourceSnap = await getDocs(sourceQuery);
    const sourceBudgets = parseSnapshotDocs(sourceSnap, budgetSchema);

    if (sourceBudgets.length === 0) {
      return { copiedCount: 0, skippedCount: 0 };
    }

    let toCopy = sourceBudgets;
    let skippedCount = 0;

    if (!options?.overwrite) {
      const targetQuery = query(
        budgetsCol(uid),
        where('month', '==', targetMonth),
      );
      const targetSnap = await getDocs(targetQuery);
      const targetBudgets = parseSnapshotDocs(targetSnap, budgetSchema);
      const existingCategoryIds = new Set(
        targetBudgets.map((b) => b.categoryId),
      );

      toCopy = sourceBudgets.filter(
        (b) => !existingCategoryIds.has(b.categoryId),
      );
      skippedCount = sourceBudgets.length - toCopy.length;
    }

    if (toCopy.length === 0) {
      return { copiedCount: 0, skippedCount };
    }

    const batch = writeBatch(db);
    for (const budget of toCopy) {
      const targetId = buildBudgetId(targetMonth, budget.categoryId);
      const docRef = budgetDoc(uid, targetId);
      batch.set(docRef, {
        categoryId: budget.categoryId,
        month: targetMonth,
        limit: budget.limit,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();

    return {
      copiedCount: toCopy.length,
      skippedCount,
    };
  } catch (error) {
    throw toAppError(error);
  }
}
