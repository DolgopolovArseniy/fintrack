import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  increment,
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
import { DELETE_FIELD, validAccount } from './helpers/docs';
import { realTimestamp, seedDocument } from './helpers/seed';

describe('Accounts Rules (§8.3)', () => {
  let ctx: RulesTestContexts;
  const accountPath = `users/${OWNER_UID}/accounts/acc_1`;

  beforeAll(async () => {
    ctx = await createRulesTestContexts();
  });

  afterAll(async () => {
    await cleanupTestEnv();
  });

  beforeEach(async () => {
    await clearFirestore();
  });

  describe('Valid Account Creations', () => {
    it('allows creation with name only', async () => {
      const ref = docRef(ctx.ownerDb, accountPath);
      await assertSucceeds(
        setDoc(
          ref,
          validAccount({ name: 'Cash Wallet', systemKey: DELETE_FIELD }),
        ),
      );
    });

    it('allows creation with systemKey only', async () => {
      const ref = docRef(ctx.ownerDb, accountPath);
      await assertSucceeds(
        setDoc(
          ref,
          validAccount({ name: DELETE_FIELD, systemKey: 'main_account' }),
        ),
      );
    });

    it('allows creation with both name and systemKey', async () => {
      const ref = docRef(ctx.ownerDb, accountPath);
      await assertSucceeds(
        setDoc(
          ref,
          validAccount({ name: 'Main Card', systemKey: 'main_card' }),
        ),
      );
    });

    it('allows creation with negative balance', async () => {
      const ref = docRef(ctx.ownerDb, accountPath);
      await assertSucceeds(setDoc(ref, validAccount({ balance: -50000 })));
    });

    it.each([
      ['positive boundary 10^12', 1000000000000],
      ['negative boundary -10^12', -1000000000000],
    ])('allows creation with balance at %s', async (_, balance) => {
      const ref = docRef(ctx.ownerDb, accountPath);
      await assertSucceeds(setDoc(ref, validAccount({ balance })));
    });

    it.each([
      ['positive boundary 10^12', 1000000000000],
      ['negative boundary -10^12', -1000000000000],
    ])(
      'allows creation with initialBalance at %s',
      async (_, initialBalance) => {
        const ref = docRef(ctx.ownerDb, accountPath);
        await assertSucceeds(setDoc(ref, validAccount({ initialBalance })));
      },
    );

    it.each(['cash', 'card', 'bank'])(
      'allows creation with type: %s',
      async (type) => {
        const ref = docRef(ctx.ownerDb, accountPath);
        await assertSucceeds(setDoc(ref, validAccount({ type })));
      },
    );

    it.each([true, false])(
      'allows creation with archived: %s',
      async (archived) => {
        const ref = docRef(ctx.ownerDb, accountPath);
        await assertSucceeds(setDoc(ref, validAccount({ archived })));
      },
    );

    it('allows creation with name at max length (40 chars)', async () => {
      const ref = docRef(ctx.ownerDb, accountPath);
      await assertSucceeds(setDoc(ref, validAccount({ name: 'A'.repeat(40) })));
    });

    it('allows creation with systemKey at max length (30 chars)', async () => {
      const ref = docRef(ctx.ownerDb, accountPath);
      await assertSucceeds(
        setDoc(
          ref,
          validAccount({ name: DELETE_FIELD, systemKey: 'K'.repeat(30) }),
        ),
      );
    });
  });

  describe('Invalid Account Creations', () => {
    it('denies creation when neither name nor systemKey is provided', async () => {
      const ref = docRef(ctx.ownerDb, accountPath);
      const invalidData = validAccount({
        name: DELETE_FIELD,
        systemKey: DELETE_FIELD,
      });
      await assertFails(setDoc(ref, invalidData));
    });

    it.each([
      'type',
      'balance',
      'initialBalance',
      'archived',
      'createdAt',
      'updatedAt',
    ])(
      'denies creation when required key "%s" is missing',
      async (missingKey) => {
        const ref = docRef(ctx.ownerDb, accountPath);
        const invalidData = validAccount({ [missingKey]: DELETE_FIELD });
        await assertFails(setDoc(ref, invalidData));
      },
    );

    it.each([
      ['extra string field', { extra: 'extraField' }],
      ['currency field', { currency: 'USD' }],
      ['userId field', { userId: OWNER_UID }],
    ])('denies creation with extra keys (%s)', async (_, extra) => {
      const ref = docRef(ctx.ownerDb, accountPath);
      await assertFails(setDoc(ref, validAccount(extra)));
    });

    it.each([
      ['crypto', { type: 'crypto' }],
      ['empty type', { type: '' }],
      ['number type', { type: 123 }],
      ['savings (unsupported)', { type: 'savings' }],
    ])('denies invalid type: %s', async (_, override) => {
      const ref = docRef(ctx.ownerDb, accountPath);
      await assertFails(setDoc(ref, validAccount(override)));
    });

    it.each([
      ['float balance', { balance: 10.5 }],
      ['string balance', { balance: '100' }],
      ['balance exceeds 10^12 + 1', { balance: 1000000000001 }],
      ['balance exceeds -10^12 - 1', { balance: -1000000000001 }],
      ['null balance', { balance: null }],
    ])('denies invalid balance: %s', async (_, override) => {
      const ref = docRef(ctx.ownerDb, accountPath);
      await assertFails(setDoc(ref, validAccount(override)));
    });

    it.each([
      ['float initialBalance', { initialBalance: 10.5 }],
      ['string initialBalance', { initialBalance: '0' }],
      ['initialBalance exceeds 10^12 + 1', { initialBalance: 1000000000001 }],
      ['initialBalance exceeds -10^12 - 1', { initialBalance: -1000000000001 }],
    ])('denies invalid initialBalance: %s', async (_, override) => {
      const ref = docRef(ctx.ownerDb, accountPath);
      await assertFails(setDoc(ref, validAccount(override)));
    });

    it.each([
      ['string "true"', { archived: 'true' }],
      ['number 1', { archived: 1 }],
      ['null', { archived: null }],
    ])('denies non-boolean archived (%s)', async (_, override) => {
      const ref = docRef(ctx.ownerDb, accountPath);
      await assertFails(setDoc(ref, validAccount(override)));
    });

    it.each([
      ['empty name', { name: '' }],
      ['name exceeds 40 chars (41)', { name: 'A'.repeat(41) }],
      ['number as name', { name: 12345 }],
      ['boolean as name', { name: true }],
    ])('denies invalid name: %s', async (_, override) => {
      const ref = docRef(ctx.ownerDb, accountPath);
      await assertFails(setDoc(ref, validAccount(override)));
    });

    it.each([
      ['empty systemKey', { systemKey: '' }],
      ['systemKey exceeds 30 chars (31)', { systemKey: 'K'.repeat(31) }],
      ['number as systemKey', { systemKey: 12345 }],
      ['boolean as systemKey', { systemKey: true }],
    ])('denies invalid systemKey: %s', async (_, override) => {
      const ref = docRef(ctx.ownerDb, accountPath);
      await assertFails(setDoc(ref, validAccount(override)));
    });

    it('denies creation with client-side timestamp for createdAt', async () => {
      const ref = docRef(ctx.ownerDb, accountPath);
      await assertFails(
        setDoc(ref, validAccount({ createdAt: Timestamp.now() })),
      );
    });

    it('denies creation with client-side timestamp for updatedAt', async () => {
      const ref = docRef(ctx.ownerDb, accountPath);
      await assertFails(
        setDoc(ref, validAccount({ updatedAt: Timestamp.now() })),
      );
    });
  });

  describe('Account Updates', () => {
    const existingAccount = {
      type: 'card',
      balance: 1000,
      initialBalance: 1000,
      archived: false,
      name: 'Main Card',
      createdAt: realTimestamp(),
      updatedAt: realTimestamp(),
    };

    beforeEach(async () => {
      await seedDocument(accountPath, existingAccount);
    });

    it('allows owner to increment balance with serverTimestamp updatedAt', async () => {
      const ref = docRef(ctx.ownerDb, accountPath);
      await assertSucceeds(
        updateDoc(ref, {
          balance: increment(500),
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('allows owner to archive account with serverTimestamp updatedAt', async () => {
      const ref = docRef(ctx.ownerDb, accountPath);
      await assertSucceeds(
        updateDoc(ref, {
          archived: true,
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('allows owner to update name with serverTimestamp updatedAt', async () => {
      const ref = docRef(ctx.ownerDb, accountPath);
      await assertSucceeds(
        updateDoc(ref, {
          name: 'Renamed Card',
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('denies update without updating updatedAt', async () => {
      const ref = docRef(ctx.ownerDb, accountPath);
      await assertFails(
        updateDoc(ref, {
          archived: true,
        }),
      );
    });

    it('denies increment pushing balance beyond maximum boundary (> 10^12)', async () => {
      await seedDocument(accountPath, {
        ...existingAccount,
        balance: 1000000000000,
      });

      const ref = docRef(ctx.ownerDb, accountPath);
      await assertFails(
        updateDoc(ref, {
          balance: increment(1),
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('denies increment pushing balance beyond minimum boundary (< -10^12)', async () => {
      await seedDocument(accountPath, {
        ...existingAccount,
        balance: -1000000000000,
      });

      const ref = docRef(ctx.ownerDb, accountPath);
      await assertFails(
        updateDoc(ref, {
          balance: increment(-1),
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('denies updating createdAt timestamp', async () => {
      const ref = docRef(ctx.ownerDb, accountPath);
      await assertFails(
        updateDoc(ref, {
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('denies updating with invalid type', async () => {
      const ref = docRef(ctx.ownerDb, accountPath);
      await assertFails(
        updateDoc(ref, {
          type: 'crypto',
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('denies update by other user', async () => {
      const ref = docRef(ctx.otherDb, accountPath);
      await assertFails(
        updateDoc(ref, {
          name: 'Hacked Name',
          updatedAt: serverTimestamp(),
        }),
      );
    });
  });

  describe('Account Deletion', () => {
    beforeEach(async () => {
      await seedDocument(accountPath, {
        type: 'card',
        balance: 0,
        initialBalance: 0,
        archived: false,
        name: 'Disposable Card',
        createdAt: realTimestamp(),
        updatedAt: realTimestamp(),
      });
    });

    it('allows owner to delete account', async () => {
      const ref = docRef(ctx.ownerDb, accountPath);
      await assertSucceeds(deleteDoc(ref));
    });

    it('denies other user from deleting owner account', async () => {
      const ref = docRef(ctx.otherDb, accountPath);
      await assertFails(deleteDoc(ref));
    });
  });
});
