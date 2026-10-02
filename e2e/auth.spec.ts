/// <reference lib="dom" />
import { expect, test } from '@playwright/test';
import { checkA11y } from './helpers/a11y';
import {
  clearAuthEmulator,
  createUniqueTestUser,
  getAuthEmulatorOobCodes,
  registerTestUser,
  signOutTestUser,
} from './helpers/auth';

test.describe('F02 — Authentication E2E flows', () => {
  test.beforeEach(async () => {
    await clearAuthEmulator();
  });

  test('Scenario 1: Guest on /app/dashboard redirects to /login?returnTo=...', async ({
    page,
  }) => {
    await page.goto('/app/dashboard');

    await expect(page).toHaveURL(/\/login\?returnTo=%2Fapp%2Fdashboard/);
    await expect(
      page.getByRole('heading', { name: /welcome back|вход/i }),
    ).toBeVisible();

    // App shell layout must not be rendered to guests
    await expect(
      page.getByRole('navigation', { name: /main navigation/i }),
    ).toHaveCount(0);
  });

  test('Scenario 2: User registration redirects to app with verification banner and name in menu', async ({
    page,
  }) => {
    const user = createUniqueTestUser('reg');

    await registerTestUser(page, user);

    await expect(page).toHaveURL(/\/app\/dashboard/);

    // Email verification banner is visible for unverified password accounts
    const banner = page.getByRole('region', {
      name: /verify your email|подтвердите email/i,
    });
    await expect(banner).toBeVisible();

    // User display name appears in the UserMenu trigger
    const accountTrigger = page.getByRole('button', {
      name: /account|аккаунт/i,
    });
    await expect(accountTrigger).toBeVisible();
    await expect(accountTrigger).toContainText(user.displayName);
  });

  test('Scenario 3: Sign out performs full reload and protects private routes', async ({
    page,
  }) => {
    const user = createUniqueTestUser('logout');
    await registerTestUser(page, user);

    await signOutTestUser(page);

    await expect(page).toHaveURL(/\/login/);

    // Attempting to open protected dashboard redirects back to login
    await page.goto('/app/dashboard');
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fapp%2Fdashboard/);
  });

  test('Scenario 4: Sign in respects returnTo and validates wrong password', async ({
    page,
  }) => {
    const user = createUniqueTestUser('signin');
    await registerTestUser(page, user);
    await signOutTestUser(page);

    await page.goto('/login?returnTo=%2Fapp%2Ftransactions');

    // 1. Submit incorrect password
    await page.getByLabel(/email/i).fill(user.email);
    const passwordInput = page.locator('input[name="password"]');
    await passwordInput.fill('WrongPassword123!');
    await page.getByRole('button', { name: /sign in|войти/i }).click();

    // Alert error appears
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();

    // Password field is cleared and retains focus
    await expect(passwordInput).toHaveValue('');
    await expect(passwordInput).toBeFocused();
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fapp%2Ftransactions/);

    // 2. Submit correct password
    await passwordInput.fill(user.password);
    await page.getByRole('button', { name: /sign in|войти/i }).click();

    // Redirects to safe returnTo target
    await page.waitForURL(/\/app\/transactions/);
    await expect(page).toHaveURL(/\/app\/transactions/);
  });

  test('Scenario 5: Password reset displays success screen and creates oobCode in emulator', async ({
    page,
  }) => {
    const user = createUniqueTestUser('reset');
    await registerTestUser(page, user);
    await signOutTestUser(page);

    // 1. Reset password for existing user
    await page.goto('/reset-password');
    await page.getByLabel(/email/i).fill(user.email);
    await page
      .getByRole('button', { name: /send reset link|отправить/i })
      .click();

    await expect(
      page.getByText(/check your email|проверьте почту/i),
    ).toBeVisible();

    // Verify emulator recorded the OOB code
    const codes = await getAuthEmulatorOobCodes();
    const userCode = codes.find(
      (c) => c.email === user.email && c.requestType === 'PASSWORD_RESET',
    );
    expect(userCode).toBeDefined();

    // 2. Anti-enumeration: non-existent email displays identical success state
    await page.goto('/reset-password');
    await page
      .getByLabel(/email/i)
      .fill(`nonexistent_${Date.now()}@example.com`);
    await page
      .getByRole('button', { name: /send reset link|отправить/i })
      .click();

    await expect(
      page.getByText(/check your email|проверьте почту/i),
    ).toBeVisible();
  });

  test('Scenario 6: Authenticated user visiting auth pages is redirected to dashboard', async ({
    page,
  }) => {
    const user = createUniqueTestUser('public_guard');
    await registerTestUser(page, user);

    await page.goto('/login');
    await page.waitForURL(/\/app\/dashboard/);
    await expect(page).toHaveURL(/\/app\/dashboard/);

    await page.goto('/register');
    await page.waitForURL(/\/app\/dashboard/);
    await expect(page).toHaveURL(/\/app\/dashboard/);

    await page.goto('/reset-password');
    await page.waitForURL(/\/app\/dashboard/);
    await expect(page).toHaveURL(/\/app\/dashboard/);
  });

  test('Scenario 7: Language switch persists across page reloads on auth screens', async ({
    page,
  }) => {
    await page.goto('/login');

    const submitBtn = page.getByRole('button', { name: /sign in|войти/i });
    await expect(submitBtn).toHaveText(/sign in/i);

    // Switch to Russian
    const langToggle = page.getByRole('button', {
      name: /change language|сменить язык/i,
    });
    await langToggle.click();

    await expect(submitBtn).toHaveText(/войти/i);

    // Reload page and assert persistence
    await page.reload();
    await expect(
      page.getByRole('button', { name: /sign in|войти/i }),
    ).toHaveText(/войти/i);

    // Switch back to English
    await page
      .getByRole('button', { name: /change language|сменить язык/i })
      .click();
    await expect(
      page.getByRole('button', { name: /sign in|войти/i }),
    ).toHaveText(/sign in/i);

    await page.reload();
    await expect(
      page.getByRole('button', { name: /sign in|войти/i }),
    ).toHaveText(/sign in/i);
  });

  test('Scenario 8: axe accessibility in light/dark themes and mobile 360px usability', async ({
    page,
  }) => {
    // 1. Accessibility on /login (Light theme)
    await page.goto('/login');
    await checkA11y(page);

    // 2. Accessibility on /login (Dark theme)
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await checkA11y(page);

    // 3. Accessibility on /register (Light theme)
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
    });
    await page.goto('/register');
    await checkA11y(page);

    // 4. Accessibility on /register (Dark theme)
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await checkA11y(page);

    // 5. Mobile viewport 360px usability
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/login');

    // Confirm no horizontal scrolling
    const hasHorizontalOverflow = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
      );
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Confirm inputs and action button are fully visible
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /sign in|войти/i }),
    ).toBeVisible();
  });
});
