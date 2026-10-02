import { expect, test } from '@playwright/test';
import {
  clearAuthEmulator,
  createUniqueTestUser,
  registerTestUser,
} from './helpers/auth';

test.describe('Smoke tests', () => {
  test.beforeEach(async () => {
    await clearAuthEmulator();
  });

  test('guest loading root page redirects to login and renders auth layout', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole('heading', { name: /welcome back|вход/i }),
    ).toBeVisible();
  });

  test('authenticated user loading root page redirects to dashboard and renders navigation', async ({
    page,
  }) => {
    const user = createUniqueTestUser('smoke');
    await registerTestUser(page, user);

    await page.goto('/');
    await expect(page).toHaveURL(/\/app\/dashboard/);
    await expect(
      page.getByRole('navigation', { name: /main navigation/i }),
    ).toBeVisible();
  });
});
