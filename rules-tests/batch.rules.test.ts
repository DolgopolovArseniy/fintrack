import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  getDoc,
  increment,
  serverTimestamp,
  Timestamp,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import {
  cleanupTestEnv,
  clearFirestore,
  createRulesTestContexts,
  docRef,
  OWNER_UID,
  type RulesTestContexts,
} from './helpers/env';
import {
  validAccount,
  validCategory,
  validProfile,
  validTransaction,
} from './helpers/docs';
import { realTimestamp, seedDocument } from './helpers/seed';
import { IMPORT_CHUNK_SIZE } from '@/lib/limits';

describe('Batch Operations and Timestamps Rules (§8.7)', () => {
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

  it('allows atomic batch: creating a transaction and updating account balance via increment', async () => {
    const accPath = `users/${OWNER_UID}/accounts/acc_main`;
    const txPath = `users/${OWNER_UID}/transactions/tx_batch_1`;

    await seedDocument(accPath, {
      type: 'card',
      balance: 10000,
      initialBalance: 10000,
      archived: false,
      name: 'Main Card',
      createdAt: realTimestamp(),
      updatedAt: realTimestamp(),
    });

    const batch = writeBatch(ctx.ownerDb as unknown as Firestore);

    batch.set(
      docRef(ctx.ownerDb, txPath),
      validTransaction({
        type: 'expense',
        amount: 2500,
        accountId: 'acc_main',
      }),
    );

    batch.update(docRef(ctx.ownerDb, accPath), {
      balance: increment(-2500),
      updatedAt: serverTimestamp(),
    });

    await assertSucceeds(batch.commit());

    // Verify both were written
    const txSnap = await getDoc(docRef(ctx.ownerDb, txPath));
    const accSnap = await getDoc(docRef(ctx.ownerDb, accPath));

    expect(txSnap.exists()).toBe(true);
    expect(txSnap.data()?.amount).toBe(2500);
    expect(accSnap.exists()).toBe(true);
    expect(accSnap.data()?.balance).toBe(7500);
  });

  it('allows onboarding batch: profile, account, and multiple categories created together', async () => {
    const profilePath = `users/${OWNER_UID}`;
    const accountPath = `users/${OWNER_UID}/accounts/acc_default`;
    const expCategoryPath = `users/${OWNER_UID}/categories/cat_food`;
    const incCategoryPath = `users/${OWNER_UID}/categories/cat_salary`;

    const batch = writeBatch(ctx.ownerDb as unknown as Firestore);

    batch.set(docRef(ctx.ownerDb, profilePath), validProfile());
    batch.set(
      docRef(ctx.ownerDb, accountPath),
      validAccount({ name: 'Cash', type: 'cash' }),
    );
    batch.set(
      docRef(ctx.ownerDb, expCategoryPath),
      validCategory({ name: 'Food', type: 'expense', icon: 'utensils' }),
    );
    batch.set(
      docRef(ctx.ownerDb, incCategoryPath),
      validCategory({ name: 'Salary', type: 'income', icon: 'wallet' }),
    );

    await assertSucceeds(batch.commit());

    const profileSnap = await getDoc(docRef(ctx.ownerDb, profilePath));
    const accountSnap = await getDoc(docRef(ctx.ownerDb, accountPath));
    const cat1Snap = await getDoc(docRef(ctx.ownerDb, expCategoryPath));
    const cat2Snap = await getDoc(docRef(ctx.ownerDb, incCategoryPath));

    expect(profileSnap.exists()).toBe(true);
    expect(accountSnap.exists()).toBe(true);
    expect(cat1Snap.exists()).toBe(true);
    expect(cat2Snap.exists()).toBe(true);
  });

  it('atomically rejects entire batch if even a single document is invalid (no partial writes)', async () => {
    const accPath = `users/${OWNER_UID}/accounts/acc_test`;
    const validTxPath = `users/${OWNER_UID}/transactions/tx_valid`;
    const invalidTxPath = `users/${OWNER_UID}/transactions/tx_invalid`;

    await seedDocument(accPath, {
      type: 'card',
      balance: 5000,
      initialBalance: 5000,
      archived: false,
      name: 'Card',
      createdAt: realTimestamp(),
      updatedAt: realTimestamp(),
    });

    const batch = writeBatch(ctx.ownerDb as unknown as Firestore);

    // 1. Valid transaction
    batch.set(
      docRef(ctx.ownerDb, validTxPath),
      validTransaction({ amount: 1000 }),
    );

    // 2. Valid account balance update
    batch.update(docRef(ctx.ownerDb, accPath), {
      balance: increment(-1000),
      updatedAt: serverTimestamp(),
    });

    // 3. INVALID transaction: negative amount violates rules
    batch.set(
      docRef(ctx.ownerDb, invalidTxPath),
      validTransaction({ amount: -100 }),
    );

    await assertFails(batch.commit());

    // Check with security rules disabled that NOTHING was committed to Firestore
    await ctx.env.withSecurityRulesDisabled(async (adminCtx) => {
      const adminDb = adminCtx.firestore();
      const validTxSnap = await getDoc(docRef(adminDb, validTxPath));
      const invalidTxSnap = await getDoc(docRef(adminDb, invalidTxPath));
      const accSnap = await getDoc(docRef(adminDb, accPath));

      expect(validTxSnap.exists()).toBe(false);
      expect(invalidTxSnap.exists()).toBe(false);
      // Account balance must remain unchanged (5000, not 4000)
      expect(accSnap.data()?.balance).toBe(5000);
    });
  });

  it('denies batch when timestamps are client-side instead of serverTimestamp', async () => {
    const txPath = `users/${OWNER_UID}/transactions/tx_client_time`;
    const batch = writeBatch(ctx.ownerDb as unknown as Firestore);

    batch.set(
      docRef(ctx.ownerDb, txPath),
      validTransaction({ createdAt: Timestamp.now() }),
    );

    await assertFails(batch.commit());
  });

  it('denies batch update modifying createdAt timestamp', async () => {
    const txPath = `users/${OWNER_UID}/transactions/tx_change_created`;
    await seedDocument(txPath, {
      type: 'expense',
      amount: 1000,
      accountId: 'acc1',
      categoryId: 'cat1',
      date: '2026-05-15',
      createdAt: realTimestamp(),
      updatedAt: realTimestamp(),
    });

    const batch = writeBatch(ctx.ownerDb as unknown as Firestore);
    batch.update(docRef(ctx.ownerDb, txPath), {
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await assertFails(batch.commit());
  });

  it(`allows batch of ${IMPORT_CHUNK_SIZE} (400) transaction creations without hitting rule limits (no exists/get calls)`, async () => {
    const batch = writeBatch(ctx.ownerDb as unknown as Firestore);

    for (let i = 0; i < IMPORT_CHUNK_SIZE; i++) {
      const txPath = `users/${OWNER_UID}/transactions/tx_chunk_${i}`;
      batch.set(
        docRef(ctx.ownerDb, txPath),
        validTransaction({
          amount: 100 + (i % 1000),
          date: '2026-05-15',
        }),
      );
    }

    await assertSucceeds(batch.commit());

    // Verify first and last document were committed
    const firstRef = docRef(
      ctx.ownerDb,
      `users/${OWNER_UID}/transactions/tx_chunk_0`,
    );
    const lastRef = docRef(
      ctx.ownerDb,
      `users/${OWNER_UID}/transactions/tx_chunk_${IMPORT_CHUNK_SIZE - 1}`,
    );

    const [firstSnap, lastSnap] = await Promise.all([
      getDoc(firstRef),
      getDoc(lastRef),
    ]);

    expect(firstSnap.exists()).toBe(true);
    expect(lastSnap.exists()).toBe(true);
  });
});
