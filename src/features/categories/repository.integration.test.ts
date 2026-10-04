import { describe, expect, it } from 'vitest';
import {
  archiveCategory,
  createCategory,
  unarchiveCategory,
  updateCategory,
} from './repository';

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
  'categories repository integration (emulator)',
  () => {
    const uid = 'integration-user-categories';

    it('performs full CRUD lifecycle on categories in Firestore emulator', async () => {
      // 1. Create category
      const categoryId = await createCategory(uid, {
        type: 'expense',
        name: 'Coffee & Snacks',
        icon: 'coffee',
        color: 'amber',
      });
      expect(categoryId).toBeTruthy();

      // 2. Update category
      await updateCategory(uid, categoryId, {
        name: 'Artisan Coffee',
        color: 'orange',
      });

      // 3. Archive category
      await archiveCategory(uid, categoryId);

      // 4. Restore category
      await unarchiveCategory(uid, categoryId);
    });
  },
);
