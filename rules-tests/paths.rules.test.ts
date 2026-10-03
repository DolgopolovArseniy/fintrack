import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { assertFails } from '@firebase/rules-unit-testing';
import {
  collectionGroup,
  getDocs,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import {
  cleanupTestEnv,
  clearFirestore,
  colRef,
  createRulesTestContexts,
  docRef,
  OTHER_UID,
  OWNER_UID,
  type RulesTestContexts,
} from './helpers/env';
import { validAccount, validProfile, validTransaction } from './helpers/docs';

describe('Paths and Defaults Rules (§8.1)', () => {
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

  it('denies write to unknown subcollections under users/{uid}', async () => {
    const ref = docRef(ctx.ownerDb, `users/${OWNER_UID}/settings/theme`);
    await assertFails(setDoc(ref, { value: 'dark' }));
  });

  it('denies write to deep nested paths inside subcollections', async () => {
    const ref = docRef(
      ctx.ownerDb,
      `users/${OWNER_UID}/transactions/tx1/notes/note1`,
    );
    await assertFails(setDoc(ref, { text: 'Nested note' }));
  });

  it.each([
    ['transactions/tx1', () => validTransaction()],
    ['accounts/acc1', () => validAccount()],
    ['categories/cat1', () => ({ type: 'expense', name: 'Cat' })],
    ['budgets/b1', () => ({ limit: 100 })],
  ])('denies root write to %s', async (rootPath, getData) => {
    const ref = docRef(ctx.ownerDb, rootPath);
    await assertFails(setDoc(ref, getData()));
  });

  it('denies listing the root users collection by authenticated owner', async () => {
    await assertFails(getDocs(colRef(ctx.ownerDb, 'users')));
  });

  it('denies listing the root users collection by other authenticated user', async () => {
    await assertFails(getDocs(colRef(ctx.otherDb, 'users')));
  });

  it('denies collection group queries across user boundaries', async () => {
    const db = ctx.ownerDb as unknown as Firestore;
    await assertFails(getDocs(collectionGroup(db, 'transactions')));
    await assertFails(getDocs(collectionGroup(db, 'accounts')));
  });

  it('denies owner (alice) creating a profile document for another user (bob)', async () => {
    const ref = docRef(ctx.ownerDb, `users/${OTHER_UID}`);
    await assertFails(setDoc(ref, validProfile()));
  });
});
