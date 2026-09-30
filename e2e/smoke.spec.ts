import { expect, test } from '@playwright/test';

test('loads root page and renders app container', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#root')).toBeVisible();
});
