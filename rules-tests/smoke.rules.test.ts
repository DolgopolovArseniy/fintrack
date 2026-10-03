import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { getDoc, setDoc } from 'firebase/firestore';
import {
  createRulesTestContexts,
  cleanupTestEnv,
  clearFirestore,
  docRef,
  OWNER_UID,
  type RulesTestContexts,
} from './helpers/env';
import { validProfile } from './helpers/docs';

describe('Firestore Rules Smoke Test (Rules v1)', () => {
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

  it('allows owner to create a valid profile', async () => {
    const ref = docRef(ctx.ownerDb, `users/${OWNER_UID}`);
    await assertSucceeds(setDoc(ref, validProfile()));
  });

  it('rejects read by unauthenticated guest', async () => {
    const ref = docRef(ctx.guestDb, `users/${OWNER_UID}`);
    await assertFails(getDoc(ref));
  });

  it('rejects write by another user to owner profile', async () => {
    const ref = docRef(ctx.otherDb, `users/${OWNER_UID}`);
    await assertFails(setDoc(ref, validProfile()));
  });
});
