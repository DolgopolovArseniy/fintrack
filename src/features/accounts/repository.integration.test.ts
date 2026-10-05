import { describe, expect, it } from 'vitest';
import { createAccount, subscribeAccounts } from './repository';
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

describe.skipIf(!isEmulatorRunning)(
  'accounts repository integration (emulator)',
  () => {
    const uid = 'integration-user-accounts';

    it('creates an account and receives it via subscribeAccounts', async () => {
      const accountId = await createAccount(uid, {
        type: 'card',
        name: 'Main Card',
        initialBalance: 50000,
        archived: false,
      });
      expect(accountId).toBeTruthy();

      const receivedAccounts = await new Promise<Account[]>(
        (resolve, reject) => {
          const unsubscribe = subscribeAccounts(
            uid,
            (accounts) => {
              const found = accounts.find((a) => a.id === accountId);
              if (found) {
                unsubscribe();
                resolve(accounts);
              }
            },
            reject,
          );
        },
      );

      const created = receivedAccounts.find((a) => a.id === accountId);
      expect(created).toBeDefined();
      expect(created?.name).toBe('Main Card');
      expect(created?.type).toBe('card');
      expect(created?.initialBalance).toBe(50000);
      expect(created?.balance).toBe(50000);
      expect(created?.archived).toBe(false);
    });
  },
);
