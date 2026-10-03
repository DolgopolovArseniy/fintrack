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
import { DELETE_FIELD, validTransaction } from './helpers/docs';
import { realTimestamp, seedDocument } from './helpers/seed';
import { MAX_AMOUNT, MIN_AMOUNT } from '@/lib/limits';

describe('Transactions Rules (§8.5)', () => {
  let ctx: RulesTestContexts;
  const txPath = `users/${OWNER_UID}/transactions/tx_1`;

  beforeAll(async () => {
    ctx = await createRulesTestContexts();
  });

  afterAll(async () => {
    await cleanupTestEnv();
  });

  beforeEach(async () => {
    await clearFirestore();
  });

  describe('Valid Transaction Creations', () => {
    it('allows creation of minimal valid transaction', async () => {
      const ref = docRef(ctx.ownerDb, txPath);
      await assertSucceeds(setDoc(ref, validTransaction()));
    });

    it.each(['expense', 'income'])(
      'allows creation with type: %s',
      async (type) => {
        const ref = docRef(ctx.ownerDb, txPath);
        await assertSucceeds(setDoc(ref, validTransaction({ type })));
      },
    );

    it.each([
      ['MIN_AMOUNT (1)', MIN_AMOUNT],
      ['MAX_AMOUNT (10^11)', MAX_AMOUNT],
    ])('allows creation with amount boundary (%s)', async (_, amount) => {
      const ref = docRef(ctx.ownerDb, txPath);
      await assertSucceeds(setDoc(ref, validTransaction({ amount })));
    });

    it.each([
      ['standard date', '2026-01-01'],
      ['leap day date', '2024-02-29'],
      ['year end date', '2026-12-31'],
    ])('allows creation with valid date (%s)', async (_, date) => {
      const ref = docRef(ctx.ownerDb, txPath);
      await assertSucceeds(setDoc(ref, validTransaction({ date })));
    });

    it.each([
      ['empty note (0 chars)', ''],
      ['max length note (200 chars)', 'N'.repeat(200)],
    ])('allows creation with note boundary (%s)', async (_, note) => {
      const ref = docRef(ctx.ownerDb, txPath);
      await assertSucceeds(setDoc(ref, validTransaction({ note })));
    });

    it.each([
      ['empty tags list', []],
      ['single tag', ['groceries']],
      ['max 10 tags', Array.from({ length: 10 }, (_, i) => `tag_${i}`)],
    ])('allows creation with tags boundary (%s)', async (_, tags) => {
      const ref = docRef(ctx.ownerDb, txPath);
      await assertSucceeds(setDoc(ref, validTransaction({ tags })));
    });

    it.each([
      ['1 char accountId', 'a'],
      ['64 chars accountId', 'a'.repeat(64)],
    ])('allows creation with accountId boundary (%s)', async (_, accountId) => {
      const ref = docRef(ctx.ownerDb, txPath);
      await assertSucceeds(setDoc(ref, validTransaction({ accountId })));
    });

    it.each([
      ['1 char categoryId', 'c'],
      ['64 chars categoryId', 'c'.repeat(64)],
    ])(
      'allows creation with categoryId boundary (%s)',
      async (_, categoryId) => {
        const ref = docRef(ctx.ownerDb, txPath);
        await assertSucceeds(setDoc(ref, validTransaction({ categoryId })));
      },
    );
  });

  describe('Documented Boundaries (§8.5)', () => {
    it('allows "2026-02-31" because rules only check regex format (calendar validity is client-side)', async () => {
      const ref = docRef(ctx.ownerDb, txPath);
      await assertSucceeds(
        setDoc(ref, validTransaction({ date: '2026-02-31' })),
      );
    });

    it('allows references to non-existent accountId and categoryId (referential integrity is enforced by repository)', async () => {
      const ref = docRef(ctx.ownerDb, txPath);
      await assertSucceeds(
        setDoc(
          ref,
          validTransaction({
            accountId: 'non_existent_account_id',
            categoryId: 'non_existent_category_id',
          }),
        ),
      );
    });
  });

  describe('Invalid Transaction Creations', () => {
    it.each([
      'type',
      'amount',
      'accountId',
      'categoryId',
      'date',
      'createdAt',
      'updatedAt',
    ])(
      'denies creation when required key "%s" is missing',
      async (missingKey) => {
        const ref = docRef(ctx.ownerDb, txPath);
        const invalidData = validTransaction({ [missingKey]: DELETE_FIELD });
        await assertFails(setDoc(ref, invalidData));
      },
    );

    it.each([
      ['foo field', { foo: 'bar' }],
      ['userId field', { userId: OWNER_UID }],
      ['balanceAfter field', { balanceAfter: 5000 }],
      ['currency field', { currency: 'USD' }],
    ])('denies creation with extra keys (%s)', async (_, extra) => {
      const ref = docRef(ctx.ownerDb, txPath);
      await assertFails(setDoc(ref, validTransaction(extra)));
    });

    it.each([
      ['transfer (unsupported)', { type: 'transfer' }],
      ['empty string', { type: '' }],
      ['number type', { type: 1 }],
      ['unknown type', { type: 'investment' }],
    ])('denies invalid type: %s', async (_, override) => {
      const ref = docRef(ctx.ownerDb, txPath);
      await assertFails(setDoc(ref, validTransaction(override)));
    });

    it.each([
      ['0 (below minimum 1)', { amount: 0 }],
      ['-1 (negative amount)', { amount: -1 }],
      ['1.5 (float amount)', { amount: 1.5 }],
      ['"100" (string amount)', { amount: '100' }],
      ['null amount', { amount: null }],
      ['MAX_AMOUNT + 1', { amount: MAX_AMOUNT + 1 }],
      ['-MAX_AMOUNT', { amount: -MAX_AMOUNT }],
    ])('denies invalid amount: %s', async (_, override) => {
      const ref = docRef(ctx.ownerDb, txPath);
      await assertFails(setDoc(ref, validTransaction(override)));
    });

    it.each([
      ['empty accountId', { accountId: '' }],
      ['accountId exceeds 64 chars (65)', { accountId: 'a'.repeat(65) }],
      ['number as accountId', { accountId: 12345 }],
      ['null accountId', { accountId: null }],
    ])('denies invalid accountId: %s', async (_, override) => {
      const ref = docRef(ctx.ownerDb, txPath);
      await assertFails(setDoc(ref, validTransaction(override)));
    });

    it.each([
      ['empty categoryId', { categoryId: '' }],
      ['categoryId exceeds 64 chars (65)', { categoryId: 'c'.repeat(65) }],
      ['number as categoryId', { categoryId: 12345 }],
      ['null categoryId', { categoryId: null }],
    ])('denies invalid categoryId: %s', async (_, override) => {
      const ref = docRef(ctx.ownerDb, txPath);
      await assertFails(setDoc(ref, validTransaction(override)));
    });

    it.each([
      ['month 13 (2026-13-01)', { date: '2026-13-01' }],
      ['month 00 (2026-00-10)', { date: '2026-00-10' }],
      ['missing leading zero (2026-9-1)', { date: '2026-9-1' }],
      ['two-digit year (26-02-01)', { date: '26-02-01' }],
      ['day 32 (2026-02-32)', { date: '2026-02-32' }],
      ['day 00 (2026-02-00)', { date: '2026-02-00' }],
      ['number as date (20260201)', { date: 20260201 }],
      ['empty date string', { date: '' }],
      [
        'ISO datetime string (2026-02-01T00:00:00)',
        { date: '2026-02-01T00:00:00' },
      ],
      ['slash format (2026/02/01)', { date: '2026/02/01' }],
    ])('denies invalid date format: %s', async (_, override) => {
      const ref = docRef(ctx.ownerDb, txPath);
      await assertFails(setDoc(ref, validTransaction(override)));
    });

    it.each([
      ['note exceeds 200 chars (201)', { note: 'N'.repeat(201) }],
      ['number as note', { note: 12345 }],
      ['boolean as note', { note: true }],
    ])('denies invalid note: %s', async (_, override) => {
      const ref = docRef(ctx.ownerDb, txPath);
      await assertFails(setDoc(ref, validTransaction(override)));
    });

    it.each([
      [
        'tags exceed 10 items (11)',
        { tags: Array.from({ length: 11 }, (_, i) => `tag_${i}`) },
      ],
      ['string instead of list', { tags: 'tag1,tag2' }],
      ['number as tags', { tags: 10 }],
    ])('denies invalid tags: %s', async (_, override) => {
      const ref = docRef(ctx.ownerDb, txPath);
      await assertFails(setDoc(ref, validTransaction(override)));
    });

    it.each([
      ['client timestamp for createdAt', { createdAt: Timestamp.now() }],
      ['client timestamp for updatedAt', { updatedAt: Timestamp.now() }],
      ['string for createdAt', { createdAt: '2026-05-15T12:00:00Z' }],
      ['number for updatedAt', { updatedAt: 1715774400 }],
    ])('denies non-server timestamp: %s', async (_, override) => {
      const ref = docRef(ctx.ownerDb, txPath);
      await assertFails(setDoc(ref, validTransaction(override)));
    });
  });

  describe('Transaction Updates', () => {
    const existingTransaction = {
      type: 'expense',
      amount: 1000,
      accountId: 'acc1',
      categoryId: 'cat1',
      date: '2026-05-15',
      note: 'Initial lunch note',
      tags: ['lunch'],
      createdAt: realTimestamp(),
      updatedAt: realTimestamp(),
    };

    beforeEach(async () => {
      await seedDocument(txPath, existingTransaction);
    });

    it('allows owner to update amount with serverTimestamp updatedAt', async () => {
      const ref = docRef(ctx.ownerDb, txPath);
      await assertSucceeds(
        updateDoc(ref, {
          amount: 2500,
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('allows owner to update note and tags with serverTimestamp updatedAt', async () => {
      const ref = docRef(ctx.ownerDb, txPath);
      await assertSucceeds(
        updateDoc(ref, {
          note: 'Updated dinner note',
          tags: ['dinner', 'friends'],
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('allows owner to update date with serverTimestamp updatedAt', async () => {
      const ref = docRef(ctx.ownerDb, txPath);
      await assertSucceeds(
        updateDoc(ref, {
          date: '2026-05-16',
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('denies updating createdAt timestamp', async () => {
      const ref = docRef(ctx.ownerDb, txPath);
      await assertFails(
        updateDoc(ref, {
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('denies update without updating updatedAt', async () => {
      const ref = docRef(ctx.ownerDb, txPath);
      await assertFails(
        updateDoc(ref, {
          amount: 2000,
        }),
      );
    });

    it.each([
      ['0', 0],
      ['-500', -500],
      ['MAX_AMOUNT + 1', MAX_AMOUNT + 1],
      ['1.5 (float)', 1.5],
    ])('denies update with invalid amount (%s)', async (_, amount) => {
      const ref = docRef(ctx.ownerDb, txPath);
      await assertFails(
        updateDoc(ref, {
          amount,
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('denies update by other user', async () => {
      const ref = docRef(ctx.otherDb, txPath);
      await assertFails(
        updateDoc(ref, {
          amount: 9999,
          updatedAt: serverTimestamp(),
        }),
      );
    });
  });

  describe('Transaction Deletion', () => {
    beforeEach(async () => {
      await seedDocument(txPath, {
        type: 'expense',
        amount: 500,
        accountId: 'acc1',
        categoryId: 'cat1',
        date: '2026-05-15',
        createdAt: realTimestamp(),
        updatedAt: realTimestamp(),
      });
    });

    it('allows owner to delete transaction', async () => {
      const ref = docRef(ctx.ownerDb, txPath);
      await assertSucceeds(deleteDoc(ref));
    });

    it('denies other user from deleting owner transaction', async () => {
      const ref = docRef(ctx.otherDb, txPath);
      await assertFails(deleteDoc(ref));
    });
  });
});
