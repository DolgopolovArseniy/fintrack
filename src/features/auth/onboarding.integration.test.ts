import { describe, expect, it } from 'vitest';
import { checkProfileExists, executeOnboardingBatch } from './onboarding';

interface GlobalWithProcess {
  process?: {
    env?: Record<string, string | undefined>;
  };
}

const isEmulatorRunning = Boolean(
  typeof globalThis !== 'undefined' &&
  'process' in globalThis &&
  (globalThis as unknown as GlobalWithProcess).process?.env
    ?.FIRESTORE_EMULATOR_HOST,
);

describe.skipIf(!isEmulatorRunning)('onboarding emulator integration', () => {
  const uid = 'integration-user-test';

  it('checks profile existence and runs executeOnboardingBatch on live emulator', async () => {
    const existsBefore = await checkProfileExists(uid);
    expect(existsBefore).toBe(false);

    await executeOnboardingBatch(uid, {
      baseCurrency: 'EUR',
      locale: 'en',
      theme: 'system',
      displayName: 'Integration User',
    });

    const existsAfter = await checkProfileExists(uid);
    expect(existsAfter).toBe(true);

    // Second call is idempotent and does not fail
    await expect(
      executeOnboardingBatch(uid, {
        baseCurrency: 'EUR',
        locale: 'en',
        theme: 'system',
      }),
    ).resolves.toBeUndefined();
  });
});
