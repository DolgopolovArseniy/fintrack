import { describe, expect, it } from 'vitest';
import {
  copyBudgetsFromMonth,
  createBudget,
  deleteBudget,
  subscribeBudgetsByMonth,
  updateBudget,
} from './repository';
import type { Budget } from './schemas';

interface GlobalWithProcess {
  process?: {
    env?: Record<string, string | undefined>;
  };
}

const isEmulatorRunning = Boolean(
  typeof globalThis !== 'undefined' &&
  'process' in globalThis &&
  (globalThis as unknown as GlobalWithProcess).process?.env
    ?.FIRESTORE_EMULATOR_HOST,
);

function waitForBudgets(
  uid: string,
  month: string,
  predicate: (budgets: Budget[]) => boolean,
  timeoutMs = 5000,
): Promise<Budget[]> {
  return new Promise<Budget[]>((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe();
      reject(
        new Error(
          `Timed out waiting for budgets in month ${month} to match predicate`,
        ),
      );
    }, timeoutMs);

    const unsubscribe = subscribeBudgetsByMonth(
      uid,
      month,
      (budgets) => {
        if (predicate(budgets)) {
          clearTimeout(timer);
          unsubscribe();
          resolve(budgets);
        }
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

describe.skipIf(!isEmulatorRunning)(
  'budgets repository integration (emulator)',
  () => {
    const uid = `integration-user-budgets-${Date.now()}`;

    it('performs full budget lifecycle on emulator: create with deterministic ID, update, batch copy, delete', async () => {
      // 1. Create budgets for 2026-10
      const foodBudgetId = await createBudget(uid, {
        categoryId: 'cat-food',
        month: '2026-10',
        limit: 30000,
      });
      expect(foodBudgetId).toBe('2026-10_cat-food');

      const cafeBudgetId = await createBudget(uid, {
        categoryId: 'cat-cafe',
        month: '2026-10',
        limit: 10000,
      });
      expect(cafeBudgetId).toBe('2026-10_cat-cafe');

      const octBudgets = await waitForBudgets(
        uid,
        '2026-10',
        (b) => b.length === 2,
      );
      expect(octBudgets.find((b) => b.id === '2026-10_cat-food')?.limit).toBe(
        30000,
      );

      // 2. Update budget limit
      await updateBudget(uid, foodBudgetId, { limit: 35000 });
      const updatedBudgets = await waitForBudgets(
        uid,
        '2026-10',
        (b) => b.find((x) => x.id === '2026-10_cat-food')?.limit === 35000,
      );
      expect(
        updatedBudgets.find((b) => b.id === '2026-10_cat-food')?.limit,
      ).toBe(35000);

      // 3. Copy budgets to 2026-11
      const copyResult = await copyBudgetsFromMonth(uid, '2026-10', '2026-11', {
        overwrite: false,
      });
      expect(copyResult).toEqual({ copiedCount: 2, skippedCount: 0 });

      const novBudgets = await waitForBudgets(
        uid,
        '2026-11',
        (b) => b.length === 2,
      );
      expect(novBudgets.map((b) => b.id).sort()).toEqual([
        '2026-11_cat-cafe',
        '2026-11_cat-food',
      ]);

      // 4. Copy again without overwrite (should skip both)
      const copyAgainResult = await copyBudgetsFromMonth(
        uid,
        '2026-10',
        '2026-11',
        { overwrite: false },
      );
      expect(copyAgainResult).toEqual({ copiedCount: 0, skippedCount: 2 });

      // 5. Delete one budget
      await deleteBudget(uid, '2026-11_cat-cafe');
      const novAfterDelete = await waitForBudgets(
        uid,
        '2026-11',
        (b) => b.length === 1,
      );
      expect(novAfterDelete[0]?.id).toBe('2026-11_cat-food');
    });
  },
);
