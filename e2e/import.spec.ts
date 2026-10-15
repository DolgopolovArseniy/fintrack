/// <reference lib="dom" />
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { checkA11y } from './helpers/a11y';
import {
  clearAuthEmulator,
  clearFirestoreEmulator,
  createUniqueTestUser,
  registerTestUser,
} from './helpers/auth';

const fixturePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures/import-sample.csv',
);

test.describe('F10 — CSV Import E2E flows', () => {
  test.beforeEach(async () => {
    await clearAuthEmulator();
    await clearFirestoreEmulator();
  });

  test('Scenario: circular import with a broken row and duplicates, report, balances, re-upload', async ({
    page,
  }) => {
    const user = createUniqueTestUser('importuser');

    // 1. Register & onboard user (seeds default categories and main account)
    await registerTestUser(page, user);

    // 2. Open the import tab and check accessibility
    await page.goto('/app/import-export');
    await page.getByTestId('tab-import').click();
    await expect(page.getByTestId('import-card')).toBeVisible();
    await checkA11y(page);

    // 3. Upload the fixture: mapping is detected automatically
    await page.getByTestId('import-file-input').setInputFiles(fixturePath);
    await expect(page.getByTestId('column-map-0')).toBeVisible();

    // 4. Preview: 2 valid, 2 errors (bad date, EUR currency), 1 file duplicate
    await page.getByRole('button', { name: /continue to preview/i }).click();
    await expect(page.getByTestId('import-counters')).toContainText(
      '2 valid · 2 errors · 1 duplicates',
    );
    await expect(page.getByTestId('import-row-3')).toHaveAttribute(
      'data-status',
      'error',
    );
    await expect(page.getByTestId('import-row-5')).toHaveAttribute(
      'data-status',
      'error',
    );
    await expect(
      page.getByTestId('import-row-4').getByRole('checkbox'),
    ).not.toBeChecked();

    // 5. Import and verify the report
    await page.getByTestId('import-start-button').click();
    await expect(page.getByTestId('import-report')).toBeVisible();
    await expect(page.getByTestId('import-report')).toContainText(
      'Imported: 2',
    );

    // 6. Follow the report link into the file month
    await page.getByRole('link', { name: /view transactions/i }).click();
    await expect(page).toHaveURL(/month=2026-09/);
    await expect(page.getByText('Weekly shop').first()).toBeVisible();
    await expect(page.getByText('September pay').first()).toBeVisible();

    // 7. Balances converged on Main account
    // (-125.50 expense + 3000 income on a zero starting balance)
    await page.goto('/app/accounts');
    await expect(page.getByTestId('account-card-main')).toContainText(
      '$2,874.50',
    );

    // 8. Re-upload the same file: rows are now database duplicates
    await page.goto('/app/import-export');
    await page.getByTestId('tab-import').click();
    await expect(page.getByTestId('import-card')).toBeVisible();
    await page.getByTestId('import-file-input').setInputFiles(fixturePath);
    await page.getByRole('button', { name: /continue to preview/i }).click();
    await expect(page.getByTestId('import-counters')).toContainText(
      '0 valid · 2 errors · 3 duplicates',
    );
    await expect(page.getByTestId('import-start-button')).toBeDisabled();
  });
});
