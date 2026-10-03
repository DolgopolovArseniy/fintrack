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
import { DELETE_FIELD, validCategory } from './helpers/docs';
import { realTimestamp, seedDocument } from './helpers/seed';

describe('Categories Rules (§8.4)', () => {
  let ctx: RulesTestContexts;
  const categoryPath = `users/${OWNER_UID}/categories/cat_1`;

  beforeAll(async () => {
    ctx = await createRulesTestContexts();
  });

  afterAll(async () => {
    await cleanupTestEnv();
  });

  beforeEach(async () => {
    await clearFirestore();
  });

  describe('Valid Category Creations', () => {
    it.each(['expense', 'income'])(
      'allows creation with type: %s',
      async (type) => {
        const ref = docRef(ctx.ownerDb, categoryPath);
        await assertSucceeds(setDoc(ref, validCategory({ type })));
      },
    );

    it('allows creation with name only', async () => {
      const ref = docRef(ctx.ownerDb, categoryPath);
      await assertSucceeds(
        setDoc(
          ref,
          validCategory({ name: 'Groceries', systemKey: DELETE_FIELD }),
        ),
      );
    });

    it('allows creation with systemKey only', async () => {
      const ref = docRef(ctx.ownerDb, categoryPath);
      await assertSucceeds(
        setDoc(
          ref,
          validCategory({ name: DELETE_FIELD, systemKey: 'food_dining' }),
        ),
      );
    });

    it('allows creation with both name and systemKey', async () => {
      const ref = docRef(ctx.ownerDb, categoryPath);
      await assertSucceeds(
        setDoc(
          ref,
          validCategory({ name: 'Food & Dining', systemKey: 'food_dining' }),
        ),
      );
    });

    it.each([
      ['1 char icon', 'A'],
      ['40 chars icon (max length)', 'i'.repeat(40)],
    ])('allows creation with icon boundary (%s)', async (_, icon) => {
      const ref = docRef(ctx.ownerDb, categoryPath);
      await assertSucceeds(setDoc(ref, validCategory({ icon })));
    });

    it.each([
      ['1 char color', 'C'],
      ['20 chars color (max length)', 'c'.repeat(20)],
    ])('allows creation with color boundary (%s)', async (_, color) => {
      const ref = docRef(ctx.ownerDb, categoryPath);
      await assertSucceeds(setDoc(ref, validCategory({ color })));
    });

    it.each([true, false])(
      'allows creation with archived: %s',
      async (archived) => {
        const ref = docRef(ctx.ownerDb, categoryPath);
        await assertSucceeds(setDoc(ref, validCategory({ archived })));
      },
    );

    it('allows creation with name at max length (40 chars)', async () => {
      const ref = docRef(ctx.ownerDb, categoryPath);
      await assertSucceeds(
        setDoc(ref, validCategory({ name: 'N'.repeat(40) })),
      );
    });

    it('allows creation with systemKey at max length (30 chars)', async () => {
      const ref = docRef(ctx.ownerDb, categoryPath);
      await assertSucceeds(
        setDoc(
          ref,
          validCategory({ name: DELETE_FIELD, systemKey: 'K'.repeat(30) }),
        ),
      );
    });
  });

  describe('Invalid Category Creations', () => {
    it('denies creation when neither name nor systemKey is provided', async () => {
      const ref = docRef(ctx.ownerDb, categoryPath);
      const invalidData = validCategory({
        name: DELETE_FIELD,
        systemKey: DELETE_FIELD,
      });
      await assertFails(setDoc(ref, invalidData));
    });

    it.each(['type', 'icon', 'color', 'archived', 'createdAt', 'updatedAt'])(
      'denies creation when required key "%s" is missing',
      async (missingKey) => {
        const ref = docRef(ctx.ownerDb, categoryPath);
        const invalidData = validCategory({ [missingKey]: DELETE_FIELD });
        await assertFails(setDoc(ref, invalidData));
      },
    );

    it.each([
      ['extra string field', { extra: 'extraField' }],
      ['userId field', { userId: OWNER_UID }],
      ['order field', { order: 1 }],
    ])('denies creation with extra keys (%s)', async (_, extra) => {
      const ref = docRef(ctx.ownerDb, categoryPath);
      await assertFails(setDoc(ref, validCategory(extra)));
    });

    it.each([
      ['transfer (unsupported)', { type: 'transfer' }],
      ['crypto', { type: 'crypto' }],
      ['empty string', { type: '' }],
      ['number type', { type: 123 }],
    ])('denies invalid type: %s', async (_, override) => {
      const ref = docRef(ctx.ownerDb, categoryPath);
      await assertFails(setDoc(ref, validCategory(override)));
    });

    it.each([
      ['empty icon', { icon: '' }],
      ['icon exceeds 40 chars (41)', { icon: 'i'.repeat(41) }],
      ['number as icon', { icon: 123 }],
      ['null icon', { icon: null }],
    ])('denies invalid icon: %s', async (_, override) => {
      const ref = docRef(ctx.ownerDb, categoryPath);
      await assertFails(setDoc(ref, validCategory(override)));
    });

    it.each([
      ['empty color', { color: '' }],
      ['color exceeds 20 chars (21)', { color: 'c'.repeat(21) }],
      ['number as color', { color: 123 }],
      ['null color', { color: null }],
    ])('denies invalid color: %s', async (_, override) => {
      const ref = docRef(ctx.ownerDb, categoryPath);
      await assertFails(setDoc(ref, validCategory(override)));
    });

    it.each([
      ['string "false"', { archived: 'false' }],
      ['number 0', { archived: 0 }],
      ['null', { archived: null }],
    ])('denies non-boolean archived (%s)', async (_, override) => {
      const ref = docRef(ctx.ownerDb, categoryPath);
      await assertFails(setDoc(ref, validCategory(override)));
    });

    it.each([
      ['empty name', { name: '' }],
      ['name exceeds 40 chars (41)', { name: 'A'.repeat(41) }],
      ['number as name', { name: 12345 }],
      ['boolean as name', { name: true }],
    ])('denies invalid name: %s', async (_, override) => {
      const ref = docRef(ctx.ownerDb, categoryPath);
      await assertFails(setDoc(ref, validCategory(override)));
    });

    it.each([
      ['empty systemKey', { systemKey: '' }],
      ['systemKey exceeds 30 chars (31)', { systemKey: 'K'.repeat(31) }],
      ['number as systemKey', { systemKey: 12345 }],
      ['boolean as systemKey', { systemKey: true }],
    ])('denies invalid systemKey: %s', async (_, override) => {
      const ref = docRef(ctx.ownerDb, categoryPath);
      await assertFails(setDoc(ref, validCategory(override)));
    });

    it('denies creation with client-side timestamp for createdAt', async () => {
      const ref = docRef(ctx.ownerDb, categoryPath);
      await assertFails(
        setDoc(ref, validCategory({ createdAt: Timestamp.now() })),
      );
    });

    it('denies creation with client-side timestamp for updatedAt', async () => {
      const ref = docRef(ctx.ownerDb, categoryPath);
      await assertFails(
        setDoc(ref, validCategory({ updatedAt: Timestamp.now() })),
      );
    });
  });

  describe('Category Updates', () => {
    const existingExpenseCategory = {
      type: 'expense',
      icon: 'shopping-bag',
      color: 'blue',
      archived: false,
      name: 'Groceries',
      createdAt: realTimestamp(),
      updatedAt: realTimestamp(),
    };

    beforeEach(async () => {
      await seedDocument(categoryPath, existingExpenseCategory);
    });

    it('allows owner to rename category with serverTimestamp updatedAt', async () => {
      const ref = docRef(ctx.ownerDb, categoryPath);
      await assertSucceeds(
        updateDoc(ref, {
          name: 'Supermarket & Food',
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('allows owner to archive category with serverTimestamp updatedAt', async () => {
      const ref = docRef(ctx.ownerDb, categoryPath);
      await assertSucceeds(
        updateDoc(ref, {
          archived: true,
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('allows owner to update icon and color with serverTimestamp updatedAt', async () => {
      const ref = docRef(ctx.ownerDb, categoryPath);
      await assertSucceeds(
        updateDoc(ref, {
          icon: 'cart',
          color: 'green',
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('denies changing type on update (expense to income)', async () => {
      const ref = docRef(ctx.ownerDb, categoryPath);
      await assertFails(
        updateDoc(ref, {
          type: 'income',
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('denies changing type on update (income to expense)', async () => {
      const incomeCategoryPath = `users/${OWNER_UID}/categories/cat_income`;
      await seedDocument(incomeCategoryPath, {
        type: 'income',
        icon: 'wallet',
        color: 'emerald',
        archived: false,
        name: 'Salary',
        createdAt: realTimestamp(),
        updatedAt: realTimestamp(),
      });

      const ref = docRef(ctx.ownerDb, incomeCategoryPath);
      await assertFails(
        updateDoc(ref, {
          type: 'expense',
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('denies updating createdAt timestamp', async () => {
      const ref = docRef(ctx.ownerDb, categoryPath);
      await assertFails(
        updateDoc(ref, {
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('denies update without updating updatedAt', async () => {
      const ref = docRef(ctx.ownerDb, categoryPath);
      await assertFails(
        updateDoc(ref, {
          name: 'Renamed without updatedAt',
        }),
      );
    });

    it('denies update by other user', async () => {
      const ref = docRef(ctx.otherDb, categoryPath);
      await assertFails(
        updateDoc(ref, {
          name: 'Hacked Category',
          updatedAt: serverTimestamp(),
        }),
      );
    });
  });

  describe('Category Deletion', () => {
    beforeEach(async () => {
      await seedDocument(categoryPath, {
        type: 'expense',
        icon: 'tag',
        color: 'red',
        archived: false,
        name: 'Temp Category',
        createdAt: realTimestamp(),
        updatedAt: realTimestamp(),
      });
    });

    it('allows owner to delete category', async () => {
      const ref = docRef(ctx.ownerDb, categoryPath);
      await assertSucceeds(deleteDoc(ref));
    });

    it('denies other user from deleting owner category', async () => {
      const ref = docRef(ctx.otherDb, categoryPath);
      await assertFails(deleteDoc(ref));
    });
  });
});
