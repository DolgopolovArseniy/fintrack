import { expect, test } from '@playwright/test';

test('loads root page, redirects to dashboard, and renders layout', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/app\/dashboard/);
  await expect(
    page.getByRole('navigation', { name: /main navigation/i }),
  ).toBeVisible();
});
