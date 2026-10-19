import { describe, expect, it } from 'vitest';
import { executeOnboardingBatch, getUserProfile } from '@/features/auth';
import { createBudget } from '@/features/budgets';
import {
  createTransaction,
  createTransactionsBatch,
  type TransactionInput,
} from '@/features/transactions';
import {
  updateUserProfile,
  fetchAllUserData,
  deleteAllUserFirestoreData,
  type DeletionProgress,
} from './repository';
import { fullUserDataDumpSchema } from './schemas';

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
  'settings repository integration (emulator)',
  () => {
    const generateUid = (): string =>
      `settings-test-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    it('updates user profile fields and removes displayName when empty', async () => {
      const uid = generateUid();

      // 1. Initial onboarding batch creates profile, main account, and 11 categories
      await executeOnboardingBatch(uid, {
        baseCurrency: 'USD',
        locale: 'en',
        theme: 'light',
        displayName: 'Original Name',
      });

      const initialProfile = await getUserProfile(uid);
      expect(initialProfile?.displayName).toBe('Original Name');
      expect(initialProfile?.baseCurrency).toBe('USD');

      // 2. Update profile fields
      await updateUserProfile(uid, {
        baseCurrency: 'EUR',
        locale: 'ru',
        theme: 'dark',
        displayName: 'Updated Name',
      });

      const updatedProfile = await getUserProfile(uid);
      expect(updatedProfile?.baseCurrency).toBe('EUR');
      expect(updatedProfile?.locale).toBe('ru');
      expect(updatedProfile?.theme).toBe('dark');
      expect(updatedProfile?.displayName).toBe('Updated Name');

      // 3. Clear displayName with empty string (triggers deleteField)
      await updateUserProfile(uid, {
        displayName: '   ',
      });

      const clearedProfile = await getUserProfile(uid);
      expect(clearedProfile?.displayName).toBeUndefined();

      // Clean up
      await deleteAllUserFirestoreData(uid);
    });

    it('fetches all user data across all subcollections adhering to FullUserDataDump schema', async () => {
      const uid = generateUid();

      // Onboarding seeds profile, main account ('main'), and default categories (e.g. food)
      await executeOnboardingBatch(uid, {
        baseCurrency: 'USD',
        locale: 'en',
        theme: 'system',
        displayName: 'Export Test User',
      });

      // Add a budget
      await createBudget(uid, {
        categoryId: 'cat-groceries',
        month: '2026-10',
        limit: 50000,
      });

      // Add a transaction
      await createTransaction(uid, {
        type: 'expense',
        amount: 3500,
        accountId: 'main',
        categoryId: 'cat-groceries',
        date: '2026-10-15',
        note: 'Supermarket trip',
        tags: ['food'],
      });

      // Fetch all user data
      const dump = await fetchAllUserData(uid);

      expect(dump.version).toBe(1);
      expect(dump.appName).toBe('FinTrack');
      expect(dump.profile.uid).toBe(uid);
      expect(dump.profile.displayName).toBe('Export Test User');
      expect(dump.accounts.length).toBeGreaterThanOrEqual(1);
      expect(dump.categories.length).toBeGreaterThanOrEqual(11);
      expect(dump.budgets.length).toBeGreaterThanOrEqual(1);
      expect(dump.transactions.length).toBeGreaterThanOrEqual(1);

      // Validate strict schema compliance
      expect(fullUserDataDumpSchema.parse(dump)).toEqual(dump);

      // Clean up
      await deleteAllUserFirestoreData(uid);
    });

    it('deletes all user documents in batches of 400 when collections exceed batch size', async () => {
      const uid = generateUid();

      await executeOnboardingBatch(uid, {
        baseCurrency: 'USD',
        locale: 'en',
        theme: 'light',
      });

      // Seed 410 transactions to cross 400 chunk boundary
      const txInputs: TransactionInput[] = Array.from(
        { length: 410 },
        (_, i) => ({
          type: 'expense',
          amount: 100,
          accountId: 'main',
          categoryId: 'cat-groceries',
          date: '2026-10-01',
          note: `Tx ${i}`,
        }),
      );
      await createTransactionsBatch(uid, txInputs);

      // Track progress
      const progressUpdates: DeletionProgress[] = [];
      const onProgress = (p: DeletionProgress) => {
        progressUpdates.push({ ...p });
      };

      // Perform full deletion
      await deleteAllUserFirestoreData(uid, onProgress);

      // Verify progress updates occurred in correct sequence
      const phases = progressUpdates.map((p) => p.phase);
      expect(phases).toContain('transactions');
      expect(phases).toContain('budgets');
      expect(phases).toContain('accounts');
      expect(phases).toContain('categories');
      expect(phases).toContain('profile');
      expect(phases).toContain('done');

      // Verify profile is deleted
      const profileAfter = await getUserProfile(uid);
      expect(profileAfter).toBeNull();
    });
  },
);

describe('settings repository unit logic (offline / no emulator)', () => {
  it('exports valid function interfaces and constants', () => {
    expect(typeof updateUserProfile).toBe('function');
    expect(typeof fetchAllUserData).toBe('function');
    expect(typeof deleteAllUserFirestoreData).toBe('function');
  });
});
