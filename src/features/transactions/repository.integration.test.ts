import { describe, expect, it } from 'vitest';
import { createAccount, subscribeAccounts } from '@/features/accounts';
import {
  createTransaction,
  deleteTransaction,
  restoreTransaction,
  subscribeTransactionsByDateRange,
  subscribeTransactionsByMonth,
  updateTransaction,
} from './repository';
import type { Transaction } from './schemas';

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

function waitForAccountBalance(
  uid: string,
  accountId: string,
  expectedBalance: number,
  timeoutMs = 5000,
): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe();
      reject(
        new Error(
          `Timed out waiting for account ${accountId} balance to equal ${expectedBalance}`,
        ),
      );
    }, timeoutMs);

    const unsubscribe = subscribeAccounts(
      uid,
      (accounts) => {
        const found = accounts.find((a) => a.id === accountId);
        if (found && found.balance === expectedBalance) {
          clearTimeout(timer);
          unsubscribe();
          resolve(found.balance);
        }
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function waitForTransactions(
  uid: string,
  month: string,
  predicate: (txs: Transaction[]) => boolean,
  timeoutMs = 5000,
): Promise<Transaction[]> {
  return new Promise<Transaction[]>((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe();
      reject(
        new Error(
          `Timed out waiting for transactions matching predicate in month ${month}`,
        ),
      );
    }, timeoutMs);

    const unsubscribe = subscribeTransactionsByMonth(
      uid,
      month,
      (txs) => {
        if (predicate(txs)) {
          clearTimeout(timer);
          unsubscribe();
          resolve(txs);
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
  'transactions repository integration (emulator)',
  () => {
    const uid = `integration-user-tx-${Date.now()}`;

    it('performs atomic transactions lifecycle with account balance synchronization', async () => {
      // 1. Setup accounts
      const accountAId = await createAccount(uid, {
        type: 'card',
        name: 'Account A',
        initialBalance: 50000,
        balance: 50000,
        archived: false,
      });

      const accountBId = await createAccount(uid, {
        type: 'cash',
        name: 'Account B',
        initialBalance: 10000,
        balance: 10000,
        archived: false,
      });

      await waitForAccountBalance(uid, accountAId, 50000);
      await waitForAccountBalance(uid, accountBId, 10000);

      // 2. Create expense transaction on Account A
      const expenseId = await createTransaction(uid, {
        type: 'expense',
        amount: 1500,
        accountId: accountAId,
        categoryId: 'cat-food',
        date: '2026-05-15',
        note: 'Supermarket',
        tags: ['groceries'],
      });
      expect(expenseId).toBeTruthy();

      // Account A balance must decrease by 1500 (50000 - 1500 = 48500)
      const balanceAfterExpense = await waitForAccountBalance(
        uid,
        accountAId,
        48500,
      );
      expect(balanceAfterExpense).toBe(48500);

      // Verify transaction appears in month subscription
      const txsAfterCreate = await waitForTransactions(uid, '2026-05', (list) =>
        list.some((t) => t.id === expenseId),
      );
      const expenseTx = txsAfterCreate.find((t) => t.id === expenseId);
      expect(expenseTx).toBeDefined();
      expect(expenseTx?.type).toBe('expense');
      expect(expenseTx?.amount).toBe(1500);
      expect(expenseTx?.note).toBe('Supermarket');
      expect(expenseTx?.tags).toEqual(['groceries']);

      // 3. Create income transaction on Account A
      const incomeId = await createTransaction(uid, {
        type: 'income',
        amount: 2000,
        accountId: accountAId,
        categoryId: 'cat-salary',
        date: '2026-05-20',
      });
      expect(incomeId).toBeTruthy();

      // Account A balance must increase by 2000 (48500 + 2000 = 50500)
      await waitForAccountBalance(uid, accountAId, 50500);

      // 4. Update transaction: change amount on same account (1500 -> 2500, extra -1000)
      if (!expenseTx) {
        throw new Error('Expense transaction not found');
      }

      await updateTransaction(uid, expenseId, expenseTx, {
        amount: 2500,
        note: 'Supermarket & Bakery',
      });

      // Account A balance: 50500 - 1000 = 49500
      await waitForAccountBalance(uid, accountAId, 49500);

      const txsAfterAmountUpdate = await waitForTransactions(
        uid,
        '2026-05',
        (list) => list.some((t) => t.id === expenseId && t.amount === 2500),
      );
      const updatedExpenseTx = txsAfterAmountUpdate.find(
        (t) => t.id === expenseId,
      );
      expect(updatedExpenseTx?.amount).toBe(2500);
      expect(updatedExpenseTx?.note).toBe('Supermarket & Bakery');

      // 5. Update transaction: switch account from Account A to Account B
      if (!updatedExpenseTx) {
        throw new Error('Updated expense transaction not found');
      }

      await updateTransaction(uid, expenseId, updatedExpenseTx, {
        accountId: accountBId,
      });

      // Account A gets +2500 refund: 49500 + 2500 = 52000
      // Account B gets -2500 expense: 10000 - 2500 = 7500
      await waitForAccountBalance(uid, accountAId, 52000);
      await waitForAccountBalance(uid, accountBId, 7500);

      const txsAfterSwitch = await waitForTransactions(uid, '2026-05', (list) =>
        list.some((t) => t.id === expenseId && t.accountId === accountBId),
      );
      const switchedTx = txsAfterSwitch.find((t) => t.id === expenseId);
      expect(switchedTx?.accountId).toBe(accountBId);

      // 6. Delete transaction: should restore Account B balance
      if (!switchedTx) {
        throw new Error('Switched transaction not found');
      }

      await deleteTransaction(uid, switchedTx);

      // Account B balance restored: 7500 + 2500 = 10000
      await waitForAccountBalance(uid, accountBId, 10000);

      // Verify transaction removed from subscription
      await waitForTransactions(uid, '2026-05', (list) =>
        list.every((t) => t.id !== expenseId),
      );

      // 7. Restore transaction (Undo action)
      await restoreTransaction(uid, switchedTx);

      // Account B balance re-deducted: 10000 - 2500 = 7500
      await waitForAccountBalance(uid, accountBId, 7500);

      // Verify transaction restored with same ID
      const txsAfterRestore = await waitForTransactions(
        uid,
        '2026-05',
        (list) => list.some((t) => t.id === expenseId),
      );
      const restoredTx = txsAfterRestore.find((t) => t.id === expenseId);
      expect(restoredTx).toBeDefined();
      expect(restoredTx?.id).toBe(expenseId);
      expect(restoredTx?.amount).toBe(2500);
      expect(restoredTx?.accountId).toBe(accountBId);
    });

    it('subscribes to transactions within an arbitrary date range in descending order', async () => {
      const accountId = await createAccount(uid, {
        type: 'card',
        name: 'Date Range Account',
        initialBalance: 100000,
        balance: 100000,
        archived: false,
      });

      // Create transactions: one before range, two inside, one after
      const txBeforeId = await createTransaction(uid, {
        type: 'expense',
        amount: 100,
        accountId,
        categoryId: 'cat-1',
        date: '2026-01-15',
      });
      const txInside1Id = await createTransaction(uid, {
        type: 'expense',
        amount: 200,
        accountId,
        categoryId: 'cat-1',
        date: '2026-03-10',
      });
      const txInside2Id = await createTransaction(uid, {
        type: 'income',
        amount: 500,
        accountId,
        categoryId: 'cat-2',
        date: '2026-04-25',
      });
      const txAfterId = await createTransaction(uid, {
        type: 'expense',
        amount: 300,
        accountId,
        categoryId: 'cat-1',
        date: '2026-06-01',
      });

      const rangeResult = await new Promise<Transaction[]>(
        (resolve, reject) => {
          const timer = setTimeout(() => {
            unsub();
            reject(new Error('Timed out waiting for date range transactions'));
          }, 5000);

          const unsub = subscribeTransactionsByDateRange(
            uid,
            '2026-02-01',
            '2026-05-31',
            (txs) => {
              if (
                txs.some((t) => t.id === txInside2Id) &&
                txs.some((t) => t.id === txInside1Id)
              ) {
                clearTimeout(timer);
                unsub();
                resolve(txs);
              }
            },
            (err) => {
              clearTimeout(timer);
              reject(err);
            },
          );
        },
      );

      expect(rangeResult.some((t) => t.id === txBeforeId)).toBe(false);
      expect(rangeResult.some((t) => t.id === txAfterId)).toBe(false);
      const ids = rangeResult.map((t) => t.id);
      expect(ids.indexOf(txInside2Id)).toBeLessThan(ids.indexOf(txInside1Id));
    });
  },
);
