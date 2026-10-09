import { expect, type Page } from '@playwright/test';

export const AUTH_EMULATOR_HOST = 'http://127.0.0.1:9099';
export const EMULATOR_PROJECT_ID =
  process.env.VITE_FIREBASE_PROJECT_ID || 'fintrack-dev-4fb7e';

export interface EmulatorOobCode {
  email: string;
  oobCode: string;
  oobLink: string;
  requestType: string;
}

interface EmulatorOobCodesResponse {
  oobCodes?: EmulatorOobCode[];
}

/**
 * Flushes all user records in the Firebase Authentication Emulator.
 */
export async function clearAuthEmulator(
  projectId: string = EMULATOR_PROJECT_ID,
): Promise<void> {
  const url = `${AUTH_EMULATOR_HOST}/emulator/v1/projects/${projectId}/accounts`;
  const response = await fetch(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(
      `Failed to clear Auth emulator accounts: ${response.status} ${response.statusText}`,
    );
  }
}

/**
 * Retrieves all out-of-band codes (email verification, password reset) from the Auth Emulator.
 */
export async function getAuthEmulatorOobCodes(
  projectId: string = EMULATOR_PROJECT_ID,
): Promise<EmulatorOobCode[]> {
  const url = `${AUTH_EMULATOR_HOST}/emulator/v1/projects/${projectId}/oobCodes`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Auth emulator oobCodes: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as EmulatorOobCodesResponse;
  return data.oobCodes ?? [];
}

/**
 * Creates unique test user credentials for isolated E2E runs.
 */
export function createUniqueTestUser(prefix = 'user'): {
  email: string;
  password: string;
  displayName: string;
} {
  const uniqueId = `${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
  return {
    email: `${prefix}_${uniqueId}@example.com`,
    password: 'SecurePassword123!',
    displayName: `Test User ${uniqueId}`,
  };
}

export const FIRESTORE_EMULATOR_HOST = 'http://127.0.0.1:8080';

/**
 * Flushes all documents in the Cloud Firestore Emulator.
 */
export async function clearFirestoreEmulator(
  projectId: string = EMULATOR_PROJECT_ID,
  maxRetries = 5,
): Promise<void> {
  const url = `${FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${projectId}/databases/(default)/documents`;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, {
      method: 'DELETE',
    });

    if (response.ok) {
      return;
    }

    if (response.status === 409 && attempt < maxRetries - 1) {
      // 409 Conflict occurs if emulator has active listeners or pending transactions
      await new Promise((resolve) => setTimeout(resolve, 300));
      continue;
    }

    throw new Error(
      `Failed to clear Firestore emulator: ${response.status} ${response.statusText}`,
    );
  }
}

/**
 * Helper to register a test user through the UI and wait for dashboard redirect.
 * Handles onboarding completion if required.
 */
export async function registerTestUser(
  page: Page,
  user: { email: string; password: string; displayName?: string },
): Promise<void> {
  await page.goto('/register');
  if (user.displayName) {
    await page.getByLabel(/name|имя/i).fill(user.displayName);
  }
  await page.getByLabel(/email/i).fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  await page
    .getByRole('button', { name: /create account|зарегистрироваться/i })
    .click();

  // Freshly registered users are guarded and must complete onboarding to access dashboard
  await page.waitForURL(/\/onboarding/);
  if (user.displayName) {
    const nameInput = page.getByTestId('onboarding-display-name-input');
    const currentValue = await nameInput.inputValue();
    if (!currentValue) {
      await nameInput.fill(user.displayName);
    }
  }
  await page.getByTestId('onboarding-submit-button').click();
  await page.waitForURL(/\/app\/dashboard/);
  await expect(
    page.getByRole('navigation', { name: /main navigation/i }),
  ).toBeVisible();
}

/**
 * Helper to log in a user through the UI.
 */
export async function loginTestUser(
  page: Page,
  credentials: { email: string; password: string },
): Promise<void> {
  if (!page.url().includes('/login')) {
    await page.goto('/login');
  }
  await page.getByLabel(/email/i).fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  await page.getByRole('button', { name: /sign in|войти/i }).click();
}

/**
 * Helper to log out an authenticated user via the UserMenu dropdown.
 */
export async function signOutTestUser(page: Page): Promise<void> {
  const accountTrigger = page.getByRole('button', { name: /account|аккаунт/i });
  await expect(accountTrigger).toBeVisible();
  await accountTrigger.click();

  const signOutItem = page.getByRole('menuitem', { name: /sign out|выйти/i });
  await expect(signOutItem).toBeVisible();

  await page.evaluate(() => {
    (window as unknown as { __reloadingSignOut?: boolean }).__reloadingSignOut =
      true;
  });

  await signOutItem.click();

  // Wait for the full page reload triggered by window.location.assign to complete
  await page.waitForFunction(
    () =>
      !(window as unknown as { __reloadingSignOut?: boolean })
        .__reloadingSignOut,
  );
  await page.waitForURL(/\/login/);
  await expect(
    page.getByRole('heading', { name: /welcome back|вход/i }),
  ).toBeVisible();
}
