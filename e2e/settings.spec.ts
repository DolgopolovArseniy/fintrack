/// <reference lib="dom" />
import * as fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { checkA11y } from './helpers/a11y';
import {
  clearAuthEmulator,
  clearFirestoreEmulator,
  createUniqueTestUser,
  registerTestUser,
  loginTestUser,
} from './helpers/auth';

test.describe('F11 — Settings & Profile Management E2E', () => {
  test.beforeEach(async () => {
    await clearAuthEmulator();
    await clearFirestoreEmulator();
  });

  test('Scenario: Manage profile, currency, theme, export JSON, and delete account with redirect', async ({
    page,
  }) => {
    const user = createUniqueTestUser('settings_user');

    // 1. Register & onboard user
    await registerTestUser(page, user);

    // 2. Navigate to /app/settings
    await page.goto('/app/settings');
    const settingsPage = page.getByTestId('settings-page');
    await expect(settingsPage).toBeVisible();

    // Check accessibility on Settings page
    await checkA11y(page);

    // 3. Verify Profile details & Update display name
    await expect(settingsPage.getByText(user.email)).toBeVisible();
    const displayNameInput = page.locator('#settings-display-name');
    await expect(displayNameInput).toBeVisible();
    await displayNameInput.fill('Alex FinExpert');

    const saveNameBtn = page.getByRole('button', {
      name: /save changes|сохранить/i,
    });
    await expect(saveNameBtn).toBeEnabled();
    await saveNameBtn.click();

    // Verify success toast appears
    await expect(
      page.getByText(/profile updated successfully|профиль успешно обновлен/i),
    ).toBeVisible();

    // 4. Change Base Currency with CurrencyChangeDialog
    const currencySelect = page.locator('#settings-currency-select');
    await currencySelect.click();
    await page.getByRole('option', { name: 'EUR' }).click();

    // Dialog opens
    const currencyDialog = page.getByRole('dialog');
    await expect(currencyDialog).toBeVisible();
    await expect(
      page.getByText(/change base currency\?|изменить базовую валюту\?/i),
    ).toBeVisible();

    const confirmCurrencyBtn = page.getByRole('button', {
      name: /i understand, change currency|я понимаю, изменить валюту/i,
    });
    await confirmCurrencyBtn.click();
    await expect(currencyDialog).toHaveCount(0);
    await expect(currencySelect).toContainText('EUR');

    // 5. Change Theme to Dark
    const themeSelect = page.locator('#settings-theme-select');
    await themeSelect.click();
    await page.getByRole('option', { name: /dark|темная/i }).click();

    // Verify html element has 'dark' class
    await expect(page.locator('html')).toHaveClass(/dark/);

    // 6. Full Data Export (JSON)
    const exportBtn = page.getByRole('button', {
      name: /export all data \(json\)|экспортировать все данные/i,
    });
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).toBeEnabled();

    const downloadPromise = page.waitForEvent('download');
    await exportBtn.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(
      /^fintrack-data-export-.*\.json$/,
    );

    const downloadPath = await download.path();
    if (downloadPath) {
      interface ExportDump {
        version: number;
        appName: string;
        profile: { email: string | null };
        accounts: unknown[];
        categories: unknown[];
        transactions: unknown[];
        budgets: unknown[];
      }
      const fileContent = fs.readFileSync(downloadPath, 'utf8');
      const data = JSON.parse(fileContent) as ExportDump;
      expect(data.version).toBe(1);
      expect(data.appName).toBe('FinTrack');
      expect(data.profile.email).toBe(user.email);
      expect(Array.isArray(data.accounts)).toBe(true);
      expect(Array.isArray(data.categories)).toBe(true);
      expect(Array.isArray(data.transactions)).toBe(true);
      expect(Array.isArray(data.budgets)).toBe(true);
    }

    // 7. Danger Zone: Delete Account
    const deleteAccountBtn = page.getByRole('button', {
      name: /delete account|удалить аккаунт/i,
    });
    await expect(deleteAccountBtn).toBeVisible();
    await deleteAccountBtn.click();

    const deleteDialog = page.getByRole('dialog');
    await expect(deleteDialog).toBeVisible();

    // Step 1: Confirm phrase
    const phraseInput = page.getByTestId('delete-confirmation-input');
    await phraseInput.fill('DELETE');

    // Step 2: Password
    const passwordInput = page.getByTestId('delete-account-password');
    await passwordInput.fill(user.password);

    // Click confirm deletion
    const finalDeleteBtn = page.getByRole('button', {
      name: /permanently delete everything|безвозвратно удалить всё/i,
    });
    await expect(finalDeleteBtn).toBeEnabled();
    await finalDeleteBtn.click();

    // Should redirect to /login
    await page.waitForURL(/\/login/);
    await expect(
      page.getByRole('heading', { name: /welcome back|вход/i }),
    ).toBeVisible();

    // Verify old credentials can no longer log in
    await loginTestUser(page, user);
    await expect(
      page.getByText(
        /invalid email or password|неверный email или пароль|user not found|пользователь не найден|incorrect/i,
      ),
    ).toBeVisible();
  });
});
