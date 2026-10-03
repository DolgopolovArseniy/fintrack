import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  cleanupTestEnv,
  clearFirestore,
  colRef,
  createRulesTestContexts,
  docRef,
  OWNER_UID,
  type RulesTestContexts,
  type TestFirestore,
} from './helpers/env';
import {
  validAccount,
  validBudget,
  validCategory,
  validProfile,
  validTransaction,
} from './helpers/docs';
import { realTimestamp, seedDocument } from './helpers/seed';

interface CollectionTestCase {
  name: string;
  docPath: string;
  colPath?: string;
  createData: () => Record<string, unknown>;
  seedData: () => Record<string, unknown>;
  updatePayload: () => Record<string, unknown>;
}

const testCases: CollectionTestCase[] = [
  {
    name: 'users (profile)',
    docPath: `users/${OWNER_UID}`,
    createData: () => validProfile(),
    seedData: () => ({
      baseCurrency: 'USD',
      locale: 'en',
      theme: 'system',
      schemaVersion: 1,
      createdAt: realTimestamp(),
      updatedAt: realTimestamp(),
    }),
    updatePayload: () => ({
      theme: 'dark',
      updatedAt: serverTimestamp(),
    }),
  },
  {
    name: 'accounts',
    docPath: `users/${OWNER_UID}/accounts/acc_iso`,
    colPath: `users/${OWNER_UID}/accounts`,
    createData: () => validAccount(),
    seedData: () => ({
      type: 'card',
      balance: 1000,
      initialBalance: 1000,
      archived: false,
      name: 'Card',
      createdAt: realTimestamp(),
      updatedAt: realTimestamp(),
    }),
    updatePayload: () => ({
      balance: 2000,
      updatedAt: serverTimestamp(),
    }),
  },
  {
    name: 'categories',
    docPath: `users/${OWNER_UID}/categories/cat_iso`,
    colPath: `users/${OWNER_UID}/categories`,
    createData: () => validCategory(),
    seedData: () => ({
      type: 'expense',
      icon: 'coffee',
      color: 'brown',
      archived: false,
      name: 'Cafe',
      createdAt: realTimestamp(),
      updatedAt: realTimestamp(),
    }),
    updatePayload: () => ({
      name: 'Restaurants & Cafe',
      updatedAt: serverTimestamp(),
    }),
  },
  {
    name: 'transactions',
    docPath: `users/${OWNER_UID}/transactions/tx_iso`,
    colPath: `users/${OWNER_UID}/transactions`,
    createData: () => validTransaction(),
    seedData: () => ({
      type: 'expense',
      amount: 450,
      accountId: 'acc1',
      categoryId: 'cat1',
      date: '2026-05-10',
      createdAt: realTimestamp(),
      updatedAt: realTimestamp(),
    }),
    updatePayload: () => ({
      amount: 500,
      updatedAt: serverTimestamp(),
    }),
  },
  {
    name: 'budgets',
    docPath: `users/${OWNER_UID}/budgets/2026-05_cat1`,
    colPath: `users/${OWNER_UID}/budgets`,
    createData: () => validBudget(),
    seedData: () => ({
      categoryId: 'cat1',
      month: '2026-05',
      limit: 30000,
      createdAt: realTimestamp(),
      updatedAt: realTimestamp(),
    }),
    updatePayload: () => ({
      limit: 35000,
      updatedAt: serverTimestamp(),
    }),
  },
];

describe('Isolation and Authorization Rules (§8.1)', () => {
  let ctx: RulesTestContexts;

  beforeAll(async () => {
    ctx = await createRulesTestContexts();
  });

  afterAll(async () => {
    await cleanupTestEnv();
  });

  beforeEach(async () => {
    await clearFirestore();
  });

  describe.each(testCases)('Collection: $name', (tc) => {
    describe('Owner (alice)', () => {
      it('allows get', async () => {
        await seedDocument(tc.docPath, tc.seedData());
        await assertSucceeds(getDoc(docRef(ctx.ownerDb, tc.docPath)));
      });

      if (tc.colPath) {
        const colPath = tc.colPath;
        it('allows list', async () => {
          await seedDocument(tc.docPath, tc.seedData());
          await assertSucceeds(getDocs(colRef(ctx.ownerDb, colPath)));
        });
      }

      it('allows create with valid data', async () => {
        await assertSucceeds(
          setDoc(docRef(ctx.ownerDb, tc.docPath), tc.createData()),
        );
      });

      it('allows update with valid data and timestamp', async () => {
        await seedDocument(tc.docPath, tc.seedData());
        await assertSucceeds(
          updateDoc(docRef(ctx.ownerDb, tc.docPath), tc.updatePayload()),
        );
      });

      it('allows delete', async () => {
        await seedDocument(tc.docPath, tc.seedData());
        await assertSucceeds(deleteDoc(docRef(ctx.ownerDb, tc.docPath)));
      });
    });

    describe('Anonymous Owner (alice, sign_in_provider: anonymous)', () => {
      it('allows get', async () => {
        await seedDocument(tc.docPath, tc.seedData());
        await assertSucceeds(getDoc(docRef(ctx.anonOwnerDb, tc.docPath)));
      });

      if (tc.colPath) {
        const colPath = tc.colPath;
        it('allows list', async () => {
          await seedDocument(tc.docPath, tc.seedData());
          await assertSucceeds(getDocs(colRef(ctx.anonOwnerDb, colPath)));
        });
      }

      it('allows create with valid data', async () => {
        await assertSucceeds(
          setDoc(docRef(ctx.anonOwnerDb, tc.docPath), tc.createData()),
        );
      });

      it('allows update with valid data', async () => {
        await seedDocument(tc.docPath, tc.seedData());
        await assertSucceeds(
          updateDoc(docRef(ctx.anonOwnerDb, tc.docPath), tc.updatePayload()),
        );
      });

      it('allows delete', async () => {
        await seedDocument(tc.docPath, tc.seedData());
        await assertSucceeds(deleteDoc(docRef(ctx.anonOwnerDb, tc.docPath)));
      });
    });

    describe.each<[string, () => TestFirestore]>([
      ['Other authenticated user (bob)', () => ctx.otherDb],
      ['Unauthenticated guest', () => ctx.guestDb],
    ])('Subject: %s', (_, getDb) => {
      it('denies get', async () => {
        await seedDocument(tc.docPath, tc.seedData());
        await assertFails(getDoc(docRef(getDb(), tc.docPath)));
      });

      if (tc.colPath) {
        const colPath = tc.colPath;
        it('denies list', async () => {
          await seedDocument(tc.docPath, tc.seedData());
          await assertFails(getDocs(colRef(getDb(), colPath)));
        });
      }

      it('denies create', async () => {
        await assertFails(setDoc(docRef(getDb(), tc.docPath), tc.createData()));
      });

      it('denies update', async () => {
        await seedDocument(tc.docPath, tc.seedData());
        await assertFails(
          updateDoc(docRef(getDb(), tc.docPath), tc.updatePayload()),
        );
      });

      it('denies delete', async () => {
        await seedDocument(tc.docPath, tc.seedData());
        await assertFails(deleteDoc(docRef(getDb(), tc.docPath)));
      });
    });
  });
});
