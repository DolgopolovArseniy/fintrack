import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { getDoc, setDoc } from 'firebase/firestore';
import {
  createRulesTestContexts,
  cleanupTestEnv,
  clearFirestore,
  docRef,
  OWNER_UID,
  OTHER_UID,
  type RulesTestContexts,
} from './helpers/env';
import { seedDocument, realTimestamp } from './helpers/seed';

describe('Firestore Rules Smoke Test (Closed Rules v0)', () => {
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

  it('rejects read by owner when rules are closed', async () => {
    const ref = docRef(ctx.ownerDb, `users/${OWNER_UID}/accounts/acc1`);
    await assertFails(getDoc(ref));
  });

  it('rejects write by owner when rules are closed', async () => {
    const ref = docRef(ctx.ownerDb, `users/${OWNER_UID}/accounts/acc1`);
    await assertFails(setDoc(ref, { name: 'Cash', balance: 100 }));
  });

  it('rejects write by other user when rules are closed', async () => {
    const ref = docRef(ctx.otherDb, `users/${OTHER_UID}/accounts/acc1`);
    await assertFails(setDoc(ref, { name: 'Cash', balance: 100 }));
  });

  it('rejects read by unauthenticated guest when rules are closed', async () => {
    const ref = docRef(ctx.guestDb, `users/${OWNER_UID}`);
    await assertFails(getDoc(ref));
  });

  it('allows seeding documents with security rules disabled, while read through rules still fails', async () => {
    const path = `users/${OWNER_UID}/accounts/acc-seeded`;
    await assertSucceeds(
      seedDocument(path, {
        name: 'Seeded Account',
        balance: 5000,
        createdAt: realTimestamp(),
        updatedAt: realTimestamp(),
      }),
    );

    const ref = docRef(ctx.ownerDb, path);
    await assertFails(getDoc(ref));
  });
});
