import { describe, expect, it } from 'vitest';
import { createTransaction } from '@/features/transactions';
import {
  archiveAccount,
  createAccount,
  recalculateAccountBalance,
  subscribeAccounts,
  unarchiveAccount,
  updateAccount,
} from './repository';
import type { Account } from './schemas';

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

function waitForAccount(
  uid: string,
  accountId: string,
  predicate: (account: Account) => boolean,
  timeoutMs = 5000,
): Promise<Account> {
  return new Promise<Account>((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe();
      reject(
        new Error(
          `Timed out waiting for account ${accountId} to match predicate`,
        ),
      );
    }, timeoutMs);

    const unsubscribe = subscribeAccounts(
      uid,
      (accounts) => {
        const found = accounts.find((a) => a.id === accountId);
        if (found && predicate(found)) {
          clearTimeout(timer);
          unsubscribe();
          resolve(found);
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
  'accounts repository integration (emulator)',
  () => {
    const uid = `integration-user-accounts-${Date.now()}`;

    it('performs full account lifecycle: create, update, initialBalance delta, archive/unarchive', async () => {
      // 1. Create account
      const accountId = await createAccount(uid, {
        type: 'card',
        name: 'Main Card',
        initialBalance: 50000,
        archived: false,
      });
      expect(accountId).toBeTruthy();

      const created = await waitForAccount(
        uid,
        accountId,
        (a) => a.balance === 50000 && a.name === 'Main Card',
      );
      expect(created.type).toBe('card');
      expect(created.initialBalance).toBe(50000);
      expect(created.balance).toBe(50000);
      expect(created.archived).toBe(false);

      // 2. Update name and type without changing initialBalance
      await updateAccount(uid, accountId, created, {
        name: 'Premium Card',
        type: 'bank',
      });

      const updated = await waitForAccount(
        uid,
        accountId,
        (a) => a.name === 'Premium Card' && a.type === 'bank',
      );
      expect(updated.initialBalance).toBe(50000);
      expect(updated.balance).toBe(50000);

      // 3. Update initialBalance (from 50000 to 70000 -> +20000 delta)
      await updateAccount(uid, accountId, updated, {
        initialBalance: 70000,
      });

      const afterInitialChange = await waitForAccount(
        uid,
        accountId,
        (a) => a.initialBalance === 70000 && a.balance === 70000,
      );
      expect(afterInitialChange.initialBalance).toBe(70000);
      expect(afterInitialChange.balance).toBe(70000);

      // 4. Archive account
      await archiveAccount(uid, accountId);
      const archived = await waitForAccount(
        uid,
        accountId,
        (a) => a.archived === true,
      );
      expect(archived.archived).toBe(true);

      // 5. Unarchive account
      await unarchiveAccount(uid, accountId);
      const unarchived = await waitForAccount(
        uid,
        accountId,
        (a) => a.archived === false,
      );
      expect(unarchived.archived).toBe(false);
    });

    it('accurately recalculates account balance from initialBalance and transaction history', async () => {
      // 1. Create account with initialBalance 10000
      const accountId = await createAccount(uid, {
        type: 'card',
        name: 'Recalculate Test Card',
        initialBalance: 10000,
        archived: false,
      });

      await waitForAccount(
        uid,
        accountId,
        (a) => a.initialBalance === 10000 && a.balance === 10000,
      );

      // 2. Add income (+5000) and expense (-2000)
      await createTransaction(uid, {
        type: 'income',
        amount: 5000,
        accountId,
        categoryId: 'cat-salary',
        date: '2026-05-01',
      });

      await createTransaction(uid, {
        type: 'expense',
        amount: 2000,
        accountId,
        categoryId: 'cat-food',
        date: '2026-05-02',
      });

      // Balance after transactions: 10000 + 5000 - 2000 = 13000
      const accountBeforeRecalc = await waitForAccount(
        uid,
        accountId,
        (a) => a.balance === 13000,
      );
      expect(accountBeforeRecalc.balance).toBe(13000);

      // 3. Perform recalculation
      const recalcResult = await recalculateAccountBalance(uid, accountId);

      expect(recalcResult).toEqual({
        previousBalance: 13000,
        newBalance: 13000,
        delta: 0,
        transactionCount: 2,
      });

      // 4. Test recalculation on fresh account with 0 transactions
      const emptyAccountId = await createAccount(uid, {
        type: 'cash',
        systemKey: 'main',
        initialBalance: 3500,
        archived: false,
      });

      await waitForAccount(
        uid,
        emptyAccountId,
        (a) => a.initialBalance === 3500 && a.balance === 3500,
      );

      const emptyRecalcResult = await recalculateAccountBalance(
        uid,
        emptyAccountId,
      );
      expect(emptyRecalcResult).toEqual({
        previousBalance: 3500,
        newBalance: 3500,
        delta: 0,
        transactionCount: 0,
      });
    });
  },
);
