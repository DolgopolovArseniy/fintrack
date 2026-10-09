/// <reference lib="dom" />
import { expect, test } from '@playwright/test';
import { checkA11y } from './helpers/a11y';
import {
  clearAuthEmulator,
  clearFirestoreEmulator,
  createUniqueTestUser,
  EMULATOR_PROJECT_ID,
  FIRESTORE_EMULATOR_HOST,
  registerTestUser,
} from './helpers/auth';

/**
 * Helper to fetch raw budget document directly from Firestore emulator REST API.
 */
async function getBudgetDocFromEmulator(
  uid: string,
  budgetId: string,
  projectId = EMULATOR_PROJECT_ID,
): Promise<{
  categoryId?: string;
  month?: string;
  limit?: number;
} | null> {
  const url = `${FIRESTORE_EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/budgets/${budgetId}`;
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as {
    fields?: {
      categoryId?: { stringValue?: string };
      month?: { stringValue?: string };
      limit?: { integerValue?: string };
    };
  };
  return {
    categoryId: data.fields?.categoryId?.stringValue,
    month: data.fields?.month?.stringValue,
    limit: data.fields?.limit?.integerValue
      ? Number(data.fields.limit.integerValue)
      : undefined,
  };
}

/**
 * Helper to retrieve current authenticated user UID from browser storage.
 */
async function getCurrentUid(
  page: import('@playwright/test').Page,
): Promise<string> {
  return await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('firebase:authUser:')) {
        try {
          const val = JSON.parse(localStorage.getItem(key) || '{}') as {
            uid?: string;
          };
          if (val.uid) return val.uid;
        } catch {
          // Ignore parse errors
        }
      }
    }
    return '';
  });
}

test.describe('F08 — Budgets & Spending Limits E2E flows', () => {
  test.beforeEach(async () => {
    await clearAuthEmulator();
    await clearFirestoreEmulator();
  });

  test('Scenario 1: Budget creation, Expense tracking & Real-time Progress transitions (Normal -> Exceeded) and a11y', async ({
    page,
  }) => {
    const user = createUniqueTestUser('budget_flow');

    // 1. Register & complete onboarding (creates default categories including "Food & Groceries")
    await registerTestUser(page, user);
    const uid = await getCurrentUid(page);

    // 2. Navigate to /app/budgets
    await page.goto('/app/budgets');
    await expect(page.getByTestId('budgets-page')).toBeVisible();

    // Initial state: empty month with no budgets
    await expect(
      page.getByText(/no budgets for this month|нет бюджетов/i),
    ).toBeVisible();
    await expect(page.getByTestId('empty-add-budget-button')).toBeVisible();

    // Run accessibility check on empty budgets page
    await checkA11y(page);

    // 3. Create a budget for "Food & Groceries" with limit 10 000
    await page.getByTestId('empty-add-budget-button').click();
    const createDialog = page.getByTestId('budget-form-dialog');
    await expect(createDialog).toBeVisible();
    await expect(
      createDialog.getByRole('heading', {
        name: /set category budget|новый лимит бюджета/i,
      }),
    ).toBeVisible();

    // Select "Food & Groceries"
    await page.getByTestId('budget-category-select').click();
    await page.getByRole('option', { name: /food & groceries/i }).click();

    // Fill limit 10 000
    await page.getByTestId('budget-limit-input').fill('10000');

    // Submit form
    await page.getByTestId('budget-form-submit').click();

    // Dialog closes and toast appears
    await expect(
      page.getByText(/budget limit created|лимит бюджета успешно установлен/i),
    ).toBeVisible();
    await expect(createDialog).toHaveCount(0);

    // Budget card is visible in list
    const foodBudgetCard = page
      .locator('[data-testid="budget-card"]')
      .filter({ hasText: /food & groceries/i });
    await expect(foodBudgetCard).toBeVisible();

    // Verify initial values on card: 0 spent, 0% progress, normal status, 10 000 remaining
    await expect(foodBudgetCard.getByText('0%')).toBeVisible();
    await expect(foodBudgetCard.getByText(/on track|в норме/i)).toBeVisible();
    await expect(foodBudgetCard.getByText(/remaining|осталось/i)).toBeVisible();
    await expect(foodBudgetCard.getByText(/10[ ,.]?000/).first()).toBeVisible();

    // Verify progress bar status attribute
    const progressBar = foodBudgetCard.locator('[role="progressbar"]');
    await expect(progressBar).toHaveAttribute('data-status', 'normal');
    await expect(progressBar).toHaveAttribute('data-progress', '0');

    // Verify deterministic ID in Firestore emulator (${month}_${categoryId})
    if (uid) {
      const budgetDoc = await getBudgetDocFromEmulator(
        uid,
        `${new Date().toISOString().slice(0, 7)}_food`,
      );
      if (budgetDoc) {
        expect(budgetDoc.categoryId).toBe('food');
        expect(budgetDoc.limit).toBe(1000000); // 10,000 in minor units
      }
    }

    // 4. Add an expense transaction of 5 000 for "Food & Groceries"
    await page.goto('/app/transactions');
    await page.getByTestId('add-transaction-button').click();
    await page.getByTestId('transaction-amount-input').fill('5000');
    await page.getByTestId('transaction-category-select').click();
    await page.getByRole('option', { name: /food & groceries/i }).click();
    await page.getByTestId('transaction-note-input').fill('First Grocery Run');
    await page.getByTestId('transaction-submit-button').click();
    await expect(
      page.getByText(/transaction added|операция добавлена/i),
    ).toBeVisible();

    // 5. Return to /app/budgets and verify 50% progress update
    await page.goto('/app/budgets');
    await expect(foodBudgetCard).toBeVisible();
    await expect(foodBudgetCard.getByText('50%')).toBeVisible();
    await expect(foodBudgetCard.getByText(/on track|в норме/i)).toBeVisible();
    await expect(foodBudgetCard.getByText(/remaining|осталось/i)).toBeVisible();
    await expect(foodBudgetCard.getByText(/5[ ,.]?000/).first()).toBeVisible();
    await expect(progressBar).toHaveAttribute('data-status', 'normal');
    await expect(progressBar).toHaveAttribute('data-progress', '50');

    // Summary header reflects 5 000 spent out of 10 000
    const summaryHeader = page.getByTestId('budget-summary-header');
    await expect(summaryHeader).toBeVisible();
    await expect(summaryHeader.getByText('50%')).toBeVisible();

    // 6. Add another expense of 6 000 (total spent becomes 11 000 -> 110% exceeded)
    await page.goto('/app/transactions');
    await page.getByTestId('add-transaction-button').click();
    await page.getByTestId('transaction-amount-input').fill('6000');
    await page.getByTestId('transaction-category-select').click();
    await page.getByRole('option', { name: /food & groceries/i }).click();
    await page
      .getByTestId('transaction-note-input')
      .fill('Big Supermarket Restock');
    await page.getByTestId('transaction-submit-button').click();
    await expect(
      page.getByText(/transaction added|операция добавлена/i),
    ).toBeVisible();

    // 7. Return to /app/budgets and verify Exceeded (>100%) status transition
    await page.goto('/app/budgets');
    await expect(foodBudgetCard).toBeVisible();
    await expect(foodBudgetCard.getByText('110%')).toBeVisible();
    await expect(foodBudgetCard.getByText(/exceeded|превышен/i)).toBeVisible();
    await expect(
      foodBudgetCard.getByText(/over budget by|превышено на/i),
    ).toBeVisible();
    await expect(foodBudgetCard.getByText(/1[ ,.]?000/).first()).toBeVisible();
    await expect(progressBar).toHaveAttribute('data-status', 'exceeded');
    await expect(progressBar).toHaveAttribute('data-progress', '110');

    // Summary header reflects overspent status
    await expect(
      summaryHeader.getByText(/overspent|перерасход/i),
    ).toBeVisible();
    await expect(summaryHeader.getByText(/1[ ,.]?000/).first()).toBeVisible();

    // 8. Accessibility check with populated exceeded card and summary
    await checkA11y(page);
  });

  test('Scenario 2: Edit budget limit, recalculate status, and navigate to filtered transactions', async ({
    page,
  }) => {
    const user = createUniqueTestUser('budget_edit');
    await registerTestUser(page, user);

    // 1. Create budget for Food & Groceries with limit 10 000
    await page.goto('/app/budgets');
    await page.getByTestId('empty-add-budget-button').click();
    await page.getByTestId('budget-category-select').click();
    await page.getByRole('option', { name: /food & groceries/i }).click();
    await page.getByTestId('budget-limit-input').fill('10000');
    await page.getByTestId('budget-form-submit').click();
    await expect(
      page.getByText(/budget limit created|лимит бюджета успешно установлен/i),
    ).toBeVisible();

    // 2. Add an expense of 11 000 (exceeds 10 000 limit)
    await page.goto('/app/transactions');
    await page.getByTestId('add-transaction-button').click();
    await page.getByTestId('transaction-amount-input').fill('11000');
    await page.getByTestId('transaction-category-select').click();
    await page.getByRole('option', { name: /food & groceries/i }).click();
    await page.getByTestId('transaction-note-input').fill('Organic Groceries');
    await page.getByTestId('transaction-submit-button').click();

    // 3. Return to /app/budgets: Card is exceeded
    await page.goto('/app/budgets');
    const foodCard = page
      .locator('[data-testid="budget-card"]')
      .filter({ hasText: /food & groceries/i });
    await expect(foodCard).toBeVisible();
    await expect(foodCard.getByText(/exceeded|превышен/i)).toBeVisible();

    // 4. Edit budget limit: increase from 10 000 to 15 000
    await foodCard.locator('button[aria-label="Actions"]').click();
    await page
      .getByRole('menuitem', { name: /edit limit|изменить лимит/i })
      .click();

    const editDialog = page.getByTestId('budget-form-dialog');
    await expect(editDialog).toBeVisible();
    await expect(
      editDialog.getByRole('heading', {
        name: /edit budget limit|изменение лимита/i,
      }),
    ).toBeVisible();

    // Change limit to 15 000
    const limitInput = page.getByTestId('budget-limit-input');
    await limitInput.fill('15000');
    await page.getByTestId('budget-form-submit').click();

    await expect(
      page.getByText(/budget limit updated|лимит бюджета успешно обновлен/i),
    ).toBeVisible();
    await expect(editDialog).toHaveCount(0);

    // 5. Verify status returns to normal: 11 000 / 15 000 = 73%
    await expect(foodCard.getByText('73%')).toBeVisible();
    await expect(foodCard.getByText(/on track|в норме/i)).toBeVisible();
    await expect(foodCard.getByText(/remaining|осталось/i)).toBeVisible();
    await expect(foodCard.getByText(/4[ ,.]?000/).first()).toBeVisible();

    // 6. Click "View transactions" in card actions menu
    await foodCard.locator('button[aria-label="Actions"]').click();
    await page
      .getByRole('menuitem', { name: /view transactions|смотреть операции/i })
      .click();

    // 7. Verify navigation to /app/transactions with category and month query params
    await page.waitForURL(/\/app\/transactions\?month=.*&categoryId=/);
    await expect(page.getByTestId('transactions-page')).toBeVisible();
    await expect(page.getByText('Organic Groceries')).toBeVisible();
  });

  test('Scenario 3: Month navigation and One-Click Copy budgets from previous month', async ({
    page,
  }) => {
    const user = createUniqueTestUser('budget_copy');
    await registerTestUser(page, user);

    await page.goto('/app/budgets');

    // 1. Create first budget: "Food & Groceries" (15 000)
    await page.getByTestId('empty-add-budget-button').click();
    await page.getByTestId('budget-category-select').click();
    await page.getByRole('option', { name: /food & groceries/i }).click();
    await page.getByTestId('budget-limit-input').fill('15000');
    await page.getByTestId('budget-form-submit').click();
    await expect(
      page.getByText(/budget limit created|лимит бюджета успешно установлен/i),
    ).toBeVisible();

    // 2. Create second budget: "Transportation" (5 000)
    await page.getByTestId('add-budget-button').click();
    await page.getByTestId('budget-category-select').click();
    await page.getByRole('option', { name: /transportation/i }).click();
    await page.getByTestId('budget-limit-input').fill('5000');
    await page.getByTestId('budget-form-submit').click();
    await expect(
      page.getByText(/budget limit created|лимит бюджета успешно установлен/i),
    ).toBeVisible();

    // Verify 2 cards exist in current month
    const budgetCards = page.locator('[data-testid="budget-card"]');
    await expect(budgetCards).toHaveCount(2);

    // 3. Navigate to next month
    await page.getByRole('button', { name: /next month/i }).click();
    await expect(page).toHaveURL(/month=\d{4}-\d{2}/);

    // 4. Next month is empty and shows fast copy banner
    const copyBanner = page.getByTestId('copy-budgets-banner');
    await expect(copyBanner).toBeVisible();
    await expect(copyBanner).toContainText(/2/);

    // 5. Click "Copy budgets" on banner
    await page.getByTestId('copy-banner-action').click();

    const copyDialog = page.getByTestId('copy-budgets-dialog');
    await expect(copyDialog).toBeVisible();
    await expect(
      copyDialog.getByText(/found 2 budgets|найдено 2 бюджета/i),
    ).toBeVisible();

    // Confirm copying
    await copyDialog
      .getByRole('button', { name: /copy budgets|скопировать/i })
      .click();

    await expect(
      page.getByText(/copied 2 budgets|скопировано 2 бюджета/i),
    ).toBeVisible();
    await expect(copyDialog).toHaveCount(0);

    // 6. Both copied budgets appear in the new month
    await expect(budgetCards).toHaveCount(2);
    await expect(
      page
        .locator('[data-testid="budget-card"]')
        .filter({ hasText: /food & groceries/i }),
    ).toBeVisible();
    await expect(
      page
        .locator('[data-testid="budget-card"]')
        .filter({ hasText: /transportation/i }),
    ).toBeVisible();
  });

  test('Scenario 4: Delete budget, Unbudgeted categories section & quick-add limit', async ({
    page,
  }) => {
    const user = createUniqueTestUser('budget_delete');
    await registerTestUser(page, user);

    await page.goto('/app/budgets');

    // 1. Create a budget for "Transportation" (6 000)
    await page.getByTestId('empty-add-budget-button').click();
    await page.getByTestId('budget-category-select').click();
    await page.getByRole('option', { name: /transportation/i }).click();
    await page.getByTestId('budget-limit-input').fill('6000');
    await page.getByTestId('budget-form-submit').click();
    await expect(
      page.getByText(/budget limit created|лимит бюджета успешно установлен/i),
    ).toBeVisible();

    const transportCard = page
      .locator('[data-testid="budget-card"]')
      .filter({ hasText: /transportation/i });
    await expect(transportCard).toBeVisible();

    // 2. Delete the budget
    await transportCard.locator('button[aria-label="Actions"]').click();
    await page
      .getByRole('menuitem', { name: /delete budget|удалить бюджет/i })
      .click();

    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog).toBeVisible();
    await expect(
      confirmDialog.getByRole('heading', {
        name: /delete budget|удаление бюджета/i,
      }),
    ).toBeVisible();

    await confirmDialog
      .getByRole('button', { name: /^delete$|^удалить$/i })
      .click();

    await expect(
      page.getByText(/budget limit removed|лимит бюджета удален/i),
    ).toBeVisible();
    await expect(confirmDialog).toHaveCount(0);

    // 3. Card disappears, empty state is shown, and "Transportation" appears in Unbudgeted section
    await expect(transportCard).toHaveCount(0);
    const unbudgetedSection = page.getByTestId('unbudgeted-categories-section');
    await expect(unbudgetedSection).toBeVisible();

    const transportChip = page
      .locator('[data-testid^="unbudgeted-category-"]')
      .filter({ hasText: /transportation/i });
    await expect(transportChip).toBeVisible();

    // 4. Click "Set limit" on the Transportation chip
    await transportChip
      .getByRole('button', { name: /set limit|задать лимит/i })
      .click();

    const createDialog = page.getByTestId('budget-form-dialog');
    await expect(createDialog).toBeVisible();

    // Enter new limit 8 000
    await page.getByTestId('budget-limit-input').fill('8000');
    await page.getByTestId('budget-form-submit').click();

    await expect(
      page.getByText(/budget limit created|лимит бюджета успешно установлен/i),
    ).toBeVisible();
    await expect(createDialog).toHaveCount(0);

    // 5. Transportation card is restored with 8 000 limit
    await expect(transportCard).toBeVisible();
    await expect(transportCard.getByText(/8[ ,.]?000/).first()).toBeVisible();
  });

  test('Scenario 5: Mobile 360px viewport usability, FAB button, Drawer dialog and dark mode a11y', async ({
    page,
  }) => {
    const user = createUniqueTestUser('budget_mobile');
    await registerTestUser(page, user);

    // Set mobile viewport (360x740)
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/app/budgets');

    // 1. Confirm no horizontal scrolling on mobile
    const hasHorizontalOverflow = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
      );
    });
    expect(hasHorizontalOverflow).toBe(false);

    // 2. Mobile Floating Action Button (FAB) is visible
    const mobileFab = page.getByTestId('mobile-add-budget-fab');
    await expect(mobileFab).toBeVisible();

    // 3. Click FAB to open budget form inside Drawer / ResponsiveDialog
    await mobileFab.click();

    const dialog = page.getByTestId('budget-form-dialog');
    await expect(dialog).toBeVisible();

    // Select "Housing" and enter limit 25 000
    await page.getByTestId('budget-category-select').click();
    await page.getByRole('option', { name: /housing/i }).click();
    await page.getByTestId('budget-limit-input').fill('25000');
    await page.getByTestId('budget-form-submit').click();

    await expect(
      page.getByText(/budget limit created|лимит бюджета успешно установлен/i),
    ).toBeVisible();
    await expect(dialog).toHaveCount(0);

    // 4. Housing budget card is visible on mobile
    const housingCard = page
      .locator('[data-testid="budget-card"]')
      .filter({ hasText: /housing/i });
    await expect(housingCard).toBeVisible();

    // 5. Accessibility audit in light and dark mode on mobile
    await checkA11y(page);

    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await checkA11y(page);
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
    });
  });
});
