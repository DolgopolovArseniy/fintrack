import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  cleanupTestEnv,
  clearFirestore,
  createRulesTestContexts,
  docRef,
  OWNER_UID,
  type RulesTestContexts,
} from './helpers/env';
import { DELETE_FIELD, validBudget } from './helpers/docs';
import { realTimestamp, seedDocument } from './helpers/seed';
import { MAX_AMOUNT, MIN_AMOUNT } from '@/lib/limits';

describe('Budgets Rules (§8.6)', () => {
  let ctx: RulesTestContexts;
  const validBudgetId = '2026-05_cat1';
  const budgetPath = `users/${OWNER_UID}/budgets/${validBudgetId}`;

  beforeAll(async () => {
    ctx = await createRulesTestContexts();
  });

  afterAll(async () => {
    await cleanupTestEnv();
  });

  beforeEach(async () => {
    await clearFirestore();
  });

  describe('Valid Budget Creations', () => {
    it('allows creation with matching budgetId and valid payload', async () => {
      const ref = docRef(ctx.ownerDb, budgetPath);
      await assertSucceeds(setDoc(ref, validBudget()));
    });

    it.each([
      ['MIN_AMOUNT (1)', MIN_AMOUNT],
      ['MAX_AMOUNT (10^11)', MAX_AMOUNT],
    ])('allows creation with limit boundary (%s)', async (_, limit) => {
      const ref = docRef(ctx.ownerDb, budgetPath);
      await assertSucceeds(setDoc(ref, validBudget({ limit })));
    });

    it.each([
      ['start of year', '2026-01'],
      ['end of year', '2026-12'],
    ])('allows creation with month boundary (%s)', async (_, month) => {
      const categoryId = 'cat1';
      const bId = `${month}_${categoryId}`;
      const path = `users/${OWNER_UID}/budgets/${bId}`;
      const ref = docRef(ctx.ownerDb, path);
      await assertSucceeds(setDoc(ref, validBudget({ month, categoryId })));
    });

    it.each([
      ['1 char categoryId', 'c'],
      ['64 chars categoryId', 'c'.repeat(64)],
    ])(
      'allows creation with categoryId boundary (%s)',
      async (_, categoryId) => {
        const month = '2026-05';
        const bId = `${month}_${categoryId}`;
        const path = `users/${OWNER_UID}/budgets/${bId}`;
        const ref = docRef(ctx.ownerDb, path);
        await assertSucceeds(setDoc(ref, validBudget({ month, categoryId })));
      },
    );
  });

  describe('Invalid Budget Creations', () => {
    it('denies creation when budgetId does not match month_categoryId', async () => {
      const mismatchPath = `users/${OWNER_UID}/budgets/2026-05_cat2`;
      const ref = docRef(ctx.ownerDb, mismatchPath);
      await assertFails(
        setDoc(ref, validBudget({ month: '2026-05', categoryId: 'cat1' })),
      );
    });

    it('denies creation with arbitrary non-matching budgetId format', async () => {
      const arbitraryPath = `users/${OWNER_UID}/budgets/my_budget_id`;
      const ref = docRef(ctx.ownerDb, arbitraryPath);
      await assertFails(
        setDoc(ref, validBudget({ month: '2026-05', categoryId: 'cat1' })),
      );
    });

    it.each(['categoryId', 'month', 'limit', 'createdAt', 'updatedAt'])(
      'denies creation when required key "%s" is missing',
      async (missingKey) => {
        const ref = docRef(ctx.ownerDb, budgetPath);
        const invalidData = validBudget({ [missingKey]: DELETE_FIELD });
        await assertFails(setDoc(ref, invalidData));
      },
    );

    it.each([
      ['extra string field', { extra: 'extraField' }],
      ['name field', { name: 'Groceries Budget' }],
      ['userId field', { userId: OWNER_UID }],
    ])('denies creation with extra keys (%s)', async (_, extra) => {
      const ref = docRef(ctx.ownerDb, budgetPath);
      await assertFails(setDoc(ref, validBudget(extra)));
    });

    it.each([
      ['month 13 (2026-13)', '2026-13'],
      ['month 00 (2026-00)', '2026-00'],
      ['missing leading zero (2026-9)', '2026-9'],
      ['missing separator (202609)', '202609'],
      ['two-digit year (26-09)', '26-09'],
      ['full date (2026-05-01)', '2026-05-01'],
      ['empty month string', ''],
    ])('denies invalid month format: %s', async (_, month) => {
      const bId = `${month}_cat1`;
      const path = `users/${OWNER_UID}/budgets/${bId}`;
      const ref = docRef(ctx.ownerDb, path);
      await assertFails(
        setDoc(ref, validBudget({ month, categoryId: 'cat1' })),
      );
    });

    it.each([
      ['0 (below minimum 1)', { limit: 0 }],
      ['-1 (negative limit)', { limit: -1 }],
      ['1.5 (float limit)', { limit: 1.5 }],
      ['"50000" (string limit)', { limit: '50000' }],
      ['null limit', { limit: null }],
      ['MAX_AMOUNT + 1', { limit: MAX_AMOUNT + 1 }],
      ['-MAX_AMOUNT', { limit: -MAX_AMOUNT }],
    ])('denies invalid limit: %s', async (_, override) => {
      const ref = docRef(ctx.ownerDb, budgetPath);
      await assertFails(setDoc(ref, validBudget(override)));
    });

    it.each([
      ['empty categoryId', ''],
      ['categoryId exceeds 64 chars (65)', 'c'.repeat(65)],
    ])('denies invalid categoryId: %s', async (_, categoryId) => {
      const month = '2026-05';
      const bId = `${month}_${categoryId}`;
      const path = `users/${OWNER_UID}/budgets/${bId}`;
      const ref = docRef(ctx.ownerDb, path);
      await assertFails(setDoc(ref, validBudget({ month, categoryId })));
    });

    it('denies creation with client-side timestamp for createdAt', async () => {
      const ref = docRef(ctx.ownerDb, budgetPath);
      await assertFails(
        setDoc(ref, validBudget({ createdAt: Timestamp.now() })),
      );
    });

    it('denies creation with client-side timestamp for updatedAt', async () => {
      const ref = docRef(ctx.ownerDb, budgetPath);
      await assertFails(
        setDoc(ref, validBudget({ updatedAt: Timestamp.now() })),
      );
    });
  });

  describe('Budget Updates', () => {
    const existingBudget = {
      categoryId: 'cat1',
      month: '2026-05',
      limit: 50000,
      createdAt: realTimestamp(),
      updatedAt: realTimestamp(),
    };

    beforeEach(async () => {
      await seedDocument(budgetPath, existingBudget);
    });

    it('allows owner to update limit with serverTimestamp updatedAt', async () => {
      const ref = docRef(ctx.ownerDb, budgetPath);
      await assertSucceeds(
        updateDoc(ref, {
          limit: 60000,
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('denies changing month on update (violates id consistency)', async () => {
      const ref = docRef(ctx.ownerDb, budgetPath);
      await assertFails(
        updateDoc(ref, {
          month: '2026-06',
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('denies changing categoryId on update (violates id consistency)', async () => {
      const ref = docRef(ctx.ownerDb, budgetPath);
      await assertFails(
        updateDoc(ref, {
          categoryId: 'cat2',
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('denies updating createdAt timestamp', async () => {
      const ref = docRef(ctx.ownerDb, budgetPath);
      await assertFails(
        updateDoc(ref, {
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('denies update without updating updatedAt', async () => {
      const ref = docRef(ctx.ownerDb, budgetPath);
      await assertFails(
        updateDoc(ref, {
          limit: 70000,
        }),
      );
    });

    it.each([
      ['0', 0],
      ['-1', -1],
      ['MAX_AMOUNT + 1', MAX_AMOUNT + 1],
      ['1.5 (float)', 1.5],
    ])('denies update with invalid limit (%s)', async (_, limit) => {
      const ref = docRef(ctx.ownerDb, budgetPath);
      await assertFails(
        updateDoc(ref, {
          limit,
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('denies update by other user', async () => {
      const ref = docRef(ctx.otherDb, budgetPath);
      await assertFails(
        updateDoc(ref, {
          limit: 80000,
          updatedAt: serverTimestamp(),
        }),
      );
    });
  });

  describe('Budget Deletion', () => {
    beforeEach(async () => {
      await seedDocument(budgetPath, {
        categoryId: 'cat1',
        month: '2026-05',
        limit: 50000,
        createdAt: realTimestamp(),
        updatedAt: realTimestamp(),
      });
    });

    it('allows owner to delete budget', async () => {
      const ref = docRef(ctx.ownerDb, budgetPath);
      await assertSucceeds(deleteDoc(ref));
    });

    it('denies other user from deleting owner budget', async () => {
      const ref = docRef(ctx.otherDb, budgetPath);
      await assertFails(deleteDoc(ref));
    });
  });
});
