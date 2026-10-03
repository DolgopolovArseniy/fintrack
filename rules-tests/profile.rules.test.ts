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
import { DELETE_FIELD, validProfile } from './helpers/docs';
import { realTimestamp, seedDocument } from './helpers/seed';

describe('Profile Rules (§8.2)', () => {
  let ctx: RulesTestContexts;
  const profilePath = `users/${OWNER_UID}`;

  beforeAll(async () => {
    ctx = await createRulesTestContexts();
  });

  afterAll(async () => {
    await cleanupTestEnv();
  });

  beforeEach(async () => {
    await clearFirestore();
  });

  describe('Valid Profile Creations', () => {
    it('allows creation with minimal required fields (without displayName)', async () => {
      const ref = docRef(ctx.ownerDb, profilePath);
      await assertSucceeds(setDoc(ref, validProfile()));
    });

    it('allows creation with displayName exactly 60 characters', async () => {
      const ref = docRef(ctx.ownerDb, profilePath);
      const displayName60 = 'A'.repeat(60);
      await assertSucceeds(
        setDoc(ref, validProfile({ displayName: displayName60 })),
      );
    });

    it.each(['light', 'dark', 'system'])(
      'allows creation with theme: %s',
      async (theme) => {
        const ref = docRef(ctx.ownerDb, profilePath);
        await assertSucceeds(setDoc(ref, validProfile({ theme })));
      },
    );

    it.each(['en', 'ru'])('allows creation with locale: %s', async (locale) => {
      const ref = docRef(ctx.ownerDb, profilePath);
      await assertSucceeds(setDoc(ref, validProfile({ locale })));
    });

    it.each(['USD', 'EUR', 'GBP', 'UAH', 'PLN', 'CZK', 'CHF', 'CAD', 'AUD'])(
      'allows creation with whitelisted baseCurrency: %s',
      async (baseCurrency) => {
        const ref = docRef(ctx.ownerDb, profilePath);
        await assertSucceeds(setDoc(ref, validProfile({ baseCurrency })));
      },
    );
  });

  describe('Invalid Profile Creations', () => {
    it.each([
      'baseCurrency',
      'locale',
      'theme',
      'schemaVersion',
      'createdAt',
      'updatedAt',
    ])(
      'denies creation when required key "%s" is missing',
      async (missingKey) => {
        const ref = docRef(ctx.ownerDb, profilePath);
        const invalidData = validProfile({ [missingKey]: DELETE_FIELD });
        await assertFails(setDoc(ref, invalidData));
      },
    );

    it.each([
      ['unknown extra field', { extra: 'extraField' }],
      ['user id field', { userId: OWNER_UID }],
      ['balance field', { balance: 100 }],
    ])('denies creation with extra keys (%s)', async (_, extraFields) => {
      const ref = docRef(ctx.ownerDb, profilePath);
      await assertFails(setDoc(ref, validProfile(extraFields)));
    });

    it.each([
      ['JPY (not in whitelist)', { baseCurrency: 'JPY' }],
      ['XXX (invalid currency code)', { baseCurrency: 'XXX' }],
      ['empty currency string', { baseCurrency: '' }],
      ['number as currency', { baseCurrency: 840 }],
    ])('denies invalid baseCurrency: %s', async (_, override) => {
      const ref = docRef(ctx.ownerDb, profilePath);
      await assertFails(setDoc(ref, validProfile(override)));
    });

    it.each([
      ['uk (unsupported locale)', { locale: 'uk' }],
      ['empty locale', { locale: '' }],
      ['number as locale', { locale: 1 }],
    ])('denies invalid locale: %s', async (_, override) => {
      const ref = docRef(ctx.ownerDb, profilePath);
      await assertFails(setDoc(ref, validProfile(override)));
    });

    it.each([
      ['blue (unknown theme)', { theme: 'blue' }],
      ['empty theme', { theme: '' }],
      ['number as theme', { theme: 0 }],
    ])('denies invalid theme: %s', async (_, override) => {
      const ref = docRef(ctx.ownerDb, profilePath);
      await assertFails(setDoc(ref, validProfile(override)));
    });

    it.each([
      ['0 (out of bounds)', { schemaVersion: 0 }],
      ['1.5 (float)', { schemaVersion: 1.5 }],
      ['"1" (string)', { schemaVersion: '1' }],
      ['1001 (above max 1000)', { schemaVersion: 1001 }],
      ['negative schemaVersion', { schemaVersion: -1 }],
    ])('denies invalid schemaVersion: %s', async (_, override) => {
      const ref = docRef(ctx.ownerDb, profilePath);
      await assertFails(setDoc(ref, validProfile(override)));
    });

    it.each([
      ['61 characters (exceeds max 60)', { displayName: 'A'.repeat(61) }],
      ['number as displayName', { displayName: 12345 }],
      ['boolean as displayName', { displayName: true }],
    ])('denies invalid displayName: %s', async (_, override) => {
      const ref = docRef(ctx.ownerDb, profilePath);
      await assertFails(setDoc(ref, validProfile(override)));
    });

    it('denies creation with client-side timestamp for createdAt', async () => {
      const ref = docRef(ctx.ownerDb, profilePath);
      await assertFails(
        setDoc(ref, validProfile({ createdAt: Timestamp.now() })),
      );
    });

    it('denies creation with client-side timestamp for updatedAt', async () => {
      const ref = docRef(ctx.ownerDb, profilePath);
      await assertFails(
        setDoc(ref, validProfile({ updatedAt: Timestamp.now() })),
      );
    });
  });

  describe('Profile Updates', () => {
    const existingProfile = {
      baseCurrency: 'USD',
      locale: 'en',
      theme: 'system',
      schemaVersion: 1,
      displayName: 'Alice Original',
      createdAt: realTimestamp(),
      updatedAt: realTimestamp(),
    };

    beforeEach(async () => {
      await seedDocument(profilePath, existingProfile);
    });

    it('allows owner to update theme with serverTimestamp updatedAt', async () => {
      const ref = docRef(ctx.ownerDb, profilePath);
      await assertSucceeds(
        updateDoc(ref, {
          theme: 'dark',
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('allows owner to update displayName with serverTimestamp updatedAt', async () => {
      const ref = docRef(ctx.ownerDb, profilePath);
      await assertSucceeds(
        updateDoc(ref, {
          displayName: 'Alice Updated',
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('denies updating createdAt timestamp', async () => {
      const ref = docRef(ctx.ownerDb, profilePath);
      await assertFails(
        updateDoc(ref, {
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('denies update without updating updatedAt', async () => {
      const ref = docRef(ctx.ownerDb, profilePath);
      await assertFails(
        updateDoc(ref, {
          theme: 'dark',
        }),
      );
    });

    it('denies update with non-whitelisted baseCurrency', async () => {
      const ref = docRef(ctx.ownerDb, profilePath);
      await assertFails(
        updateDoc(ref, {
          baseCurrency: 'JPY',
          updatedAt: serverTimestamp(),
        }),
      );
    });

    it('denies update by other user', async () => {
      const ref = docRef(ctx.otherDb, profilePath);
      await assertFails(
        updateDoc(ref, {
          theme: 'light',
          updatedAt: serverTimestamp(),
        }),
      );
    });
  });

  describe('Profile Deletion', () => {
    beforeEach(async () => {
      await seedDocument(profilePath, {
        baseCurrency: 'USD',
        locale: 'en',
        theme: 'system',
        schemaVersion: 1,
        createdAt: realTimestamp(),
        updatedAt: realTimestamp(),
      });
    });

    it('allows owner to delete profile', async () => {
      const ref = docRef(ctx.ownerDb, profilePath);
      await assertSucceeds(deleteDoc(ref));
    });

    it('denies other user from deleting owner profile', async () => {
      const ref = docRef(ctx.otherDb, profilePath);
      await assertFails(deleteDoc(ref));
    });
  });
});
