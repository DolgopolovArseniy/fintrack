/// <reference lib="dom" />
import { expect, test } from '@playwright/test';
import { checkA11y } from './helpers/a11y';
import {
  clearAuthEmulator,
  clearFirestoreEmulator,
  createUniqueTestUser,
  FIRESTORE_EMULATOR_HOST,
  EMULATOR_PROJECT_ID,
} from './helpers/auth';

/**
 * Helper to fetch the raw account balance from Firestore emulator REST API.
 */
async function getAccountBalanceFromEmulator(
  uid: string,
  accountId = 'main',
  projectId = EMULATOR_PROJECT_ID,
): Promise<number | null> {
  const url = `${FIRESTORE_EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/accounts/${accountId}`;
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as {
    fields?: {
      balance?: { integerValue?: string };
    };
  };
  return data.fields?.balance?.integerValue
    ? Number(data.fields.balance.integerValue)
    : 0;
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

test.describe('F05 — Transactions & Balance E2E flows', () => {
  test.beforeEach(async () => {
    await clearAuthEmulator();
    await clearFirestoreEmulator();
  });

  test('Scenario 1: Full Transaction CRUD lifecycle (Expense & Income), atomic account balance, and accessibility', async ({
    page,
  }) => {
    const user = createUniqueTestUser('txcrud');

    // 1. Register & complete onboarding (creates main account with balance 0 and default categories)
    await page.goto('/register');
    await page.getByLabel(/email/i).fill(user.email);
    await page.locator('input[name="password"]').fill(user.password);
    await page
      .getByRole('button', { name: /create account|зарегистрироваться/i })
      .click();
    await page.waitForURL(/\/onboarding/);
    await page.getByTestId('onboarding-submit-button').click();
    await page.waitForURL(/\/app\/dashboard/);

    const uid = await getCurrentUid(page);

    // 2. Navigate to /app/transactions
    await page.goto('/app/transactions');
    await expect(page.getByTestId('transactions-page')).toBeVisible();

    // Initial state: empty month
    await expect(
      page.getByText(/no transactions for this month/i),
    ).toBeVisible();

    // Check accessibility on empty transactions page
    await checkA11y(page);

    // 3. Create Expense transaction (1 250,00)
    await page.getByTestId('add-transaction-button').click();
    const createDialog = page.getByRole('dialog');
    await expect(createDialog).toBeVisible();
    await expect(
      page.getByText(/new transaction|новая операция/i),
    ).toBeVisible();

    // Fill amount 1250
    const amountInput = page.getByTestId('transaction-amount-input');
    await amountInput.fill('1250');

    // Select category (Food & Groceries)
    await page.getByTestId('transaction-category-select').click();
    await page.getByRole('option', { name: /food & groceries/i }).click();

    // Fill note
    await page.getByTestId('transaction-note-input').fill('Weekly Groceries');

    // Submit form
    await page.getByTestId('transaction-submit-button').click();

    // Dialog closes, toast appears
    await expect(page.getByText(/transaction added/i)).toBeVisible();
    await expect(createDialog).toHaveCount(0);

    // Expense transaction item is visible in list
    const expenseItem = page
      .locator('[data-testid^="transaction-item-"]')
      .first();
    await expect(expenseItem).toBeVisible();
    await expect(expenseItem.getByText('Weekly Groceries')).toBeVisible();
    await expect(expenseItem.getByText(/1[ ,.]?250/)).toBeVisible();

    // Monthly summary bar reflects expense
    await expect(
      page.getByTestId('summary-expense').getByText(/1[ ,.]?250/),
    ).toBeVisible();

    // Check account balance in Firestore emulator (should be -125000 minor units)
    if (uid) {
      const balanceAfterExpense = await getAccountBalanceFromEmulator(uid);
      expect(balanceAfterExpense).toBe(-125000);
    }

    // 4. Create Income transaction (3 000,00)
    await page.getByTestId('add-transaction-button').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Switch to Income tab
    await page.getByTestId('transaction-type-income').click();

    // Fill amount 3000
    await page.getByTestId('transaction-amount-input').fill('3000');

    // Select category (Salary)
    await page.getByTestId('transaction-category-select').click();
    await page.getByRole('option', { name: /salary/i }).click();

    // Fill note
    await page.getByTestId('transaction-note-input').fill('Monthly Salary');

    // Submit form
    await page.getByTestId('transaction-submit-button').click();
    await expect(page.getByText(/transaction added/i)).toBeVisible();

    // Both items visible
    await expect(page.getByText('Monthly Salary')).toBeVisible();
    await expect(page.getByText('Weekly Groceries')).toBeVisible();

    // Account balance in Firestore emulator should now be: -125000 + 300000 = +175000
    if (uid) {
      const balanceAfterIncome = await getAccountBalanceFromEmulator(uid);
      expect(balanceAfterIncome).toBe(175000);
    }

    // 5. Edit transaction: change amount from 1250 to 1500
    const weeklyGroceriesItem = page
      .locator('[data-testid^="transaction-item-"]')
      .filter({ hasText: 'Weekly Groceries' });
    await weeklyGroceriesItem.locator('button[aria-label]').click();
    await page.getByRole('menuitem', { name: /edit/i }).click();

    const editDialog = page.getByRole('dialog');
    await expect(editDialog).toBeVisible();
    await expect(page.getByText(/edit transaction/i)).toBeVisible();

    // Change note and amount
    await page
      .getByTestId('transaction-note-input')
      .fill('Supermarket & Market');
    const editAmountInput = page.getByTestId('transaction-amount-input');
    await editAmountInput.fill('1500');

    await page.getByTestId('transaction-submit-button').click();
    await expect(page.getByText(/transaction updated/i)).toBeVisible();
    await expect(editDialog).toHaveCount(0);

    await expect(page.getByText('Supermarket & Market')).toBeVisible();

    // Firestore balance after edit: 175000 - 25000 = 150000
    if (uid) {
      const balanceAfterEdit = await getAccountBalanceFromEmulator(uid);
      expect(balanceAfterEdit).toBe(150000);
    }

    // 6. Check a11y in light and dark mode with populated list
    await checkA11y(page);

    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await checkA11y(page);
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
    });
  });

  test('Scenario 2: Transaction deletion with Undo action and balance rollback', async ({
    page,
  }) => {
    const user = createUniqueTestUser('txundo');

    // Register & complete onboarding
    await page.goto('/register');
    await page.getByLabel(/email/i).fill(user.email);
    await page.locator('input[name="password"]').fill(user.password);
    await page
      .getByRole('button', { name: /create account|зарегистрироваться/i })
      .click();
    await page.waitForURL(/\/onboarding/);
    await page.getByTestId('onboarding-submit-button').click();
    await page.waitForURL(/\/app\/dashboard/);

    const uid = await getCurrentUid(page);

    await page.goto('/app/transactions');

    // 1. Add an expense of 800
    await page.getByTestId('add-transaction-button').click();
    await page.getByTestId('transaction-amount-input').fill('800');
    await page.getByTestId('transaction-category-select').click();
    await page.getByRole('option', { name: /food & groceries/i }).click();
    await page.getByTestId('transaction-note-input').fill('Quick snack');
    await page.getByTestId('transaction-submit-button').click();
    await expect(page.getByText('Quick snack')).toBeVisible();

    if (uid) {
      const bal1 = await getAccountBalanceFromEmulator(uid);
      expect(bal1).toBe(-80000);
    }

    // 2. Delete the transaction
    const item = page
      .locator('[data-testid^="transaction-item-"]')
      .filter({ hasText: 'Quick snack' });
    await item.locator('button[aria-label]').click();
    await page.getByRole('menuitem', { name: /delete/i }).click();

    // Transaction disappears immediately from UI
    await expect(page.getByText('Quick snack')).toHaveCount(0);

    // Toast with Undo button appears
    const undoButton = page.getByRole('button', { name: /undo|отменить/i });
    await expect(undoButton).toBeVisible();

    // Balance in Firestore is rolled back immediately to 0
    if (uid) {
      const balDeleted = await getAccountBalanceFromEmulator(uid);
      expect(balDeleted).toBe(0);
    }

    // 3. Click Undo button
    await undoButton.click();

    // Restoration toast appears
    await expect(page.getByText(/transaction restored/i)).toBeVisible();

    // Transaction is restored back into the list
    await expect(page.getByText('Quick snack')).toBeVisible();

    // Balance in Firestore is restored back to -80000
    if (uid) {
      const balRestored = await getAccountBalanceFromEmulator(uid);
      expect(balRestored).toBe(-80000);
    }
  });

  test('Scenario 3: Filter by type, search note, and reset filters with URL sync', async ({
    page,
  }) => {
    const user = createUniqueTestUser('txfilter');

    // Register & complete onboarding
    await page.goto('/register');
    await page.getByLabel(/email/i).fill(user.email);
    await page.locator('input[name="password"]').fill(user.password);
    await page
      .getByRole('button', { name: /create account|зарегистрироваться/i })
      .click();
    await page.waitForURL(/\/onboarding/);
    await page.getByTestId('onboarding-submit-button').click();
    await page.waitForURL(/\/app\/dashboard/);

    await page.goto('/app/transactions');

    // Add Expense 1: Coffee break
    await page.getByTestId('add-transaction-button').click();
    await page.getByTestId('transaction-amount-input').fill('450');
    await page.getByTestId('transaction-category-select').click();
    await page.getByRole('option', { name: /food & groceries/i }).click();
    await page.getByTestId('transaction-note-input').fill('Morning Coffee');
    await page.getByTestId('transaction-submit-button').click();
    await expect(page.getByText('Morning Coffee')).toBeVisible();

    // Add Income 1: Consulting bonus
    await page.getByTestId('add-transaction-button').click();
    await page.getByTestId('transaction-type-income').click();
    await page.getByTestId('transaction-amount-input').fill('5000');
    await page.getByTestId('transaction-category-select').click();
    await page.getByRole('option', { name: /salary/i }).click();
    await page.getByTestId('transaction-note-input').fill('Consulting Bonus');
    await page.getByTestId('transaction-submit-button').click();
    await expect(page.getByText('Consulting Bonus')).toBeVisible();

    // 1. Filter by Expense type
    await page.getByTestId('filter-type-expense').click();
    await expect(page).toHaveURL(/type=expense/);
    await expect(page.getByText('Morning Coffee')).toBeVisible();
    await expect(page.getByText('Consulting Bonus')).toHaveCount(0);

    // 2. Filter by Income type
    await page.getByTestId('filter-type-income').click();
    await expect(page).toHaveURL(/type=income/);
    await expect(page.getByText('Consulting Bonus')).toBeVisible();
    await expect(page.getByText('Morning Coffee')).toHaveCount(0);

    // 3. Switch back to All types
    await page.getByTestId('filter-type-all').click();
    await expect(page.getByText('Morning Coffee')).toBeVisible();
    await expect(page.getByText('Consulting Bonus')).toBeVisible();

    // 4. Search filter by note
    const searchInput = page.getByTestId('filter-search-input');
    await searchInput.fill('Coffee');
    await expect(page).toHaveURL(/search=Coffee/);
    await expect(page.getByText('Morning Coffee')).toBeVisible();
    await expect(page.getByText('Consulting Bonus')).toHaveCount(0);

    // 5. Search non-matching query triggers empty filter state
    await searchInput.fill('NonExistentKeyword');
    await expect(page.getByText(/no matching transactions/i)).toBeVisible();

    // 6. Click reset filters button
    await page.getByTestId('filter-reset-button').click();
    await expect(page.getByText('Morning Coffee')).toBeVisible();
    await expect(page.getByText('Consulting Bonus')).toBeVisible();
    await expect(page).not.toHaveURL(/search=/);
  });

  test('Scenario 4: Month navigation and URL synchronization', async ({
    page,
  }) => {
    const user = createUniqueTestUser('txmonth');

    // Register & complete onboarding
    await page.goto('/register');
    await page.getByLabel(/email/i).fill(user.email);
    await page.locator('input[name="password"]').fill(user.password);
    await page
      .getByRole('button', { name: /create account|зарегистрироваться/i })
      .click();
    await page.waitForURL(/\/onboarding/);
    await page.getByTestId('onboarding-submit-button').click();
    await page.waitForURL(/\/app\/dashboard/);

    await page.goto('/app/transactions');

    // Add transaction in current month
    await page.getByTestId('add-transaction-button').click();
    await page.getByTestId('transaction-amount-input').fill('100');
    await page.getByTestId('transaction-category-select').click();
    await page.getByRole('option', { name: /food & groceries/i }).click();
    await page.getByTestId('transaction-note-input').fill('Current Month Tx');
    await page.getByTestId('transaction-submit-button').click();
    await expect(page.getByText('Current Month Tx')).toBeVisible();

    // 1. Click Previous Month
    await page.getByRole('button', { name: /previous month/i }).click();
    await expect(page).toHaveURL(/month=\d{4}-\d{2}/);

    // Previous month has no transactions -> shows EmptyState
    await expect(
      page.getByText(/no transactions for this month/i),
    ).toBeVisible();
    await expect(page.getByText('Current Month Tx')).toHaveCount(0);

    // 2. Click "This month" button
    const thisMonthBtn = page.getByRole('button', { name: /this month/i });
    await expect(thisMonthBtn).toBeEnabled();
    await thisMonthBtn.click();

    // Returns to current month and shows transaction
    await expect(page.getByText('Current Month Tx')).toBeVisible();
  });

  test('Scenario 5: Mobile 360px viewport usability, FAB button, and responsive dialogs', async ({
    page,
  }) => {
    const user = createUniqueTestUser('txmobile');

    // Register & complete onboarding
    await page.goto('/register');
    await page.getByLabel(/email/i).fill(user.email);
    await page.locator('input[name="password"]').fill(user.password);
    await page
      .getByRole('button', { name: /create account|зарегистрироваться/i })
      .click();
    await page.waitForURL(/\/onboarding/);
    await page.getByTestId('onboarding-submit-button').click();
    await page.waitForURL(/\/app\/dashboard/);

    // Set mobile viewport
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/app/transactions');

    // Verify no horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
      );
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Header add button is hidden on mobile, floating FAB is visible
    const mobileFab = page.getByTestId('mobile-add-fab');
    await expect(mobileFab).toBeVisible();

    // Click FAB to open transaction form (renders inside ResponsiveDialog / Drawer)
    await mobileFab.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(page.getByText(/new transaction/i)).toBeVisible();

    // Fill form on mobile
    await page.getByTestId('transaction-amount-input').fill('250');
    await page.getByTestId('transaction-category-select').click();
    await page.getByRole('option', { name: /food & groceries/i }).click();
    await page.getByTestId('transaction-note-input').fill('Mobile snack');
    await page.getByTestId('transaction-submit-button').click();

    // Dialog closes and item appears
    await expect(page.getByText('Mobile snack')).toBeVisible();

    // Open mobile filter sheet
    const filterTrigger = page.getByTestId('mobile-filters-trigger');
    await expect(filterTrigger).toBeVisible();
    await filterTrigger.click();

    const sheetDialog = page.locator('[role="dialog"]');
    await expect(sheetDialog).toBeVisible();

    // Close mobile sheet with close button or ESC
    await page.keyboard.press('Escape');
    await expect(sheetDialog).toHaveCount(0);
  });
});
