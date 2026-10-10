/// <reference lib="dom" />
import * as fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { checkA11y } from './helpers/a11y';
import {
  clearAuthEmulator,
  clearFirestoreEmulator,
  createUniqueTestUser,
  registerTestUser,
} from './helpers/auth';

test.describe('F09 — CSV Export E2E flows', () => {
  test.beforeEach(async () => {
    await clearAuthEmulator();
    await clearFirestoreEmulator();
  });

  test('Scenario: Export transactions to CSV from ImportExportPage and TransactionsPage with delimiter and BOM checks', async ({
    page,
  }) => {
    const user = createUniqueTestUser('exportuser');

    // 1. Register & onboard user
    await registerTestUser(page, user);

    // 2. Create a test transaction on TransactionsPage
    await page.goto('/app/transactions');
    await expect(page.getByTestId('transactions-page')).toBeVisible();

    await page.getByTestId('add-transaction-button').click();
    const createDialog = page.getByRole('dialog');
    await expect(createDialog).toBeVisible();

    await page.getByTestId('transaction-amount-input').fill('450');
    await page.getByTestId('transaction-category-select').click();
    await page
      .getByRole('option', { name: /food|продукты/i })
      .first()
      .click();
    await page.getByTestId('transaction-note-input').fill('Supermarket weekly');
    await page.getByTestId('transaction-submit-button').click();
    await expect(createDialog).toHaveCount(0);

    // 3. Quick Export on Transactions page
    const quickExportBtn = page.getByTestId('export-quick-button');
    await expect(quickExportBtn).toBeVisible();
    await expect(quickExportBtn).toBeEnabled();

    const quickDownloadPromise = page.waitForEvent('download');
    await quickExportBtn.click();
    const quickDownload = await quickDownloadPromise;
    expect(quickDownload.suggestedFilename()).toMatch(
      /^fintrack-export-.*\.csv$/,
    );

    const quickPath = await quickDownload.path();
    if (quickPath) {
      const content = fs.readFileSync(quickPath, 'utf8');
      expect(content.startsWith('\uFEFF')).toBe(true);
      expect(content).toContain('Supermarket weekly');
      expect(content).toContain('450');
    }

    // 4. Navigate to /app/import-export
    await page.goto('/app/import-export');
    await expect(page.getByTestId('import-export-page')).toBeVisible();

    // Check accessibility
    await checkA11y(page);

    // 5. Test tab switching
    await page.getByTestId('tab-import').click();
    await expect(page.getByTestId('import-placeholder-card')).toBeVisible();
    await expect(page.getByTestId('import-badge')).toBeVisible();

    await page.getByTestId('tab-export').click();
    await expect(page.getByTestId('export-card')).toBeVisible();

    // 6. Test export configuration & export download from ExportCard
    const exportSubmitBtn = page.getByTestId('export-submit-button');
    await expect(exportSubmitBtn).toBeVisible();
    await expect(exportSubmitBtn).toBeEnabled();

    // Select semicolon delimiter
    await page.getByTestId('export-delimiter-select').click();
    await page
      .getByRole('option', { name: /semicolon|точка с запятой/i })
      .click();

    const downloadPromise = page.waitForEvent('download');
    await exportSubmitBtn.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^fintrack-export-.*\.csv$/);

    const downloadPath = await download.path();
    if (downloadPath) {
      const csvContent = fs.readFileSync(downloadPath, 'utf8');
      expect(csvContent.startsWith('\uFEFF')).toBe(true);
      expect(csvContent).toContain(';');
      expect(csvContent).toContain('Supermarket weekly');
    }
  });
});
