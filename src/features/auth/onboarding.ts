import type { OnboardingInput } from './types';
import { checkProfileDocExists, createOnboardingBatch } from './repository';

export type { OnboardingInput };

/**
 * Checks whether the user profile document exists in Firestore.
 */
export async function checkProfileExists(uid: string): Promise<boolean> {
  return checkProfileDocExists(uid);
}

/**
 * Atomically creates the initial user environment:
 * - Profile document with baseCurrency, locale, and theme
 * - Default main cash account
 * - 11 default categories (8 expense, 3 income)
 *
 * If the profile document already exists (e.g. concurrent execution in multiple tabs or React StrictMode),
 * the operation safely exits without performing duplicate writes.
 */
export async function executeOnboardingBatch(
  uid: string,
  input: OnboardingInput,
): Promise<void> {
  const exists = await checkProfileExists(uid);
  if (exists) {
    return;
  }
  await createOnboardingBatch(uid, input);
}
