/// <reference lib="dom" />
import { expect, test } from '@playwright/test';
import { checkA11y } from './helpers/a11y';
import {
  clearAuthEmulator,
  clearFirestoreEmulator,
  createUniqueTestUser,
  registerTestUser,
} from './helpers/auth';

test.describe('F06 — Dashboard & Analytics E2E flows', () => {
  test.beforeEach(async () => {
    await clearAuthEmulator();
    await clearFirestoreEmulator();
  });

  test('Scenario 1: Initial empty dashboard state, KPI cards, empty charts, and a11y audit', async ({
    page,
  }) => {
    const user = createUniqueTestUser('dashinit');

    // 1. Register & complete onboarding
    await registerTestUser(page, user);

    // Verify dashboard root container is visible
    await expect(page.getByTestId('dashboard-page')).toBeVisible();

    // 2. Verify all 4 KPI cards render initial 0.00 values
    const kpiBalance = page.getByTestId('kpi-total-balance');
    await expect(kpiBalance).toBeVisible();
    await expect(kpiBalance.getByText('$0.00')).toBeVisible();

    const kpiIncome = page.getByTestId('kpi-income');
    await expect(kpiIncome).toBeVisible();
    await expect(kpiIncome.getByText('$0.00')).toBeVisible();

    const kpiExpense = page.getByTestId('kpi-expense');
    await expect(kpiExpense).toBeVisible();
    await expect(kpiExpense.getByText('$0.00')).toBeVisible();

    const kpiNetSavings = page.getByTestId('kpi-net-savings');
    await expect(kpiNetSavings).toBeVisible();
    await expect(kpiNetSavings.getByText('$0.00')).toBeVisible();

    // 3. Verify Empty States in Donut Chart and Recent Transactions
    await expect(
      page.getByText(/no expenses recorded this month/i),
    ).toBeVisible();
    await expect(
      page.getByText(/no transactions for this month yet/i),
    ).toBeVisible();

    // 4. Accessibility audit in light and dark mode
    await checkA11y(page);

    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await checkA11y(page);
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
    });
  });

  test('Scenario 2: Quick add transactions from dashboard, reactive KPI & chart updates, and recent operations', async ({
    page,
  }) => {
    const user = createUniqueTestUser('dashcrud');

    // 1. Register & onboard
    await registerTestUser(page, user);

    // 2. Add Expense transaction from Dashboard
    await page.getByTestId('add-transaction-button').click();
    const createDialog = page.getByRole('dialog');
    await expect(createDialog).toBeVisible();
    await expect(
      createDialog.getByRole('heading', {
        name: /new transaction|новая операция/i,
      }),
    ).toBeVisible();

    // Amount: 45.00
    await page.getByTestId('transaction-amount-input').fill('45');
    await page.getByTestId('transaction-category-select').click();
    await page.getByRole('option', { name: /food & groceries/i }).click();
    await page.getByTestId('transaction-note-input').fill('Supermarket lunch');
    await page.getByTestId('transaction-submit-button').click();

    // Dialog closes and toast appears
    await expect(page.getByText(/transaction added/i)).toBeVisible();
    await expect(createDialog).toHaveCount(0);

    // 3. Verify Expense KPI updated to $45.00
    const kpiExpense = page.getByTestId('kpi-expense');
    await expect(kpiExpense.getByText('$45.00')).toBeVisible();

    // Verify Net savings updated to -45.00
    const kpiNetSavings = page.getByTestId('kpi-net-savings');
    await expect(kpiNetSavings.getByText('−$45.00')).toBeVisible();

    // 4. Verify transaction appears in Recent Transactions card
    const recentCard = page.getByTestId('recent-transactions-card');
    await expect(recentCard.getByText('Supermarket lunch')).toBeVisible();
    await expect(recentCard.getByText(/45/)).toBeVisible();

    // 5. Verify Donut Chart a11y table contains category row
    const donutRegion = page.getByRole('region', {
      name: /expenses by category/i,
    });
    await expect(donutRegion).toBeVisible();
    await expect(donutRegion.getByText(/food & groceries/i)).toBeVisible();

    // 6. Add Income transaction from Dashboard
    await page.getByTestId('add-transaction-button').click();
    await expect(createDialog).toBeVisible();

    // Switch to Income tab
    await page.getByTestId('transaction-type-income').click();
    await page.getByTestId('transaction-amount-input').fill('500');
    await page.getByTestId('transaction-category-select').click();
    await page.getByRole('option', { name: /salary/i }).click();
    await page.getByTestId('transaction-note-input').fill('Freelance project');
    await page.getByTestId('transaction-submit-button').click();

    await expect(page.getByText(/transaction added/i)).toBeVisible();
    await expect(createDialog).toHaveCount(0);

    // 7. Verify Income KPI updated to $500.00 and Net Savings to +$455.00
    const kpiIncome = page.getByTestId('kpi-income');
    await expect(kpiIncome.getByText('$500.00')).toBeVisible();
    await expect(kpiNetSavings.getByText('+$455.00')).toBeVisible();

    // Both operations visible in Recent Transactions card
    await expect(recentCard.getByText('Freelance project')).toBeVisible();
    await expect(recentCard.getByText('Supermarket lunch')).toBeVisible();
  });

  test('Scenario 3: Month navigation and "View all transactions" link preserving month context', async ({
    page,
  }) => {
    const user = createUniqueTestUser('dashnav');

    // 1. Register & onboard
    await registerTestUser(page, user);

    // 2. Add transaction in current month
    await page.getByTestId('add-transaction-button').click();
    await page.getByTestId('transaction-amount-input').fill('120');
    await page.getByTestId('transaction-category-select').click();
    await page.getByRole('option', { name: /food & groceries/i }).click();
    await page.getByTestId('transaction-note-input').fill('Monthly dinner');
    await page.getByTestId('transaction-submit-button').click();
    await expect(page.getByText(/transaction added/i)).toBeVisible();

    // 3. Click Previous month in MonthNavigator
    await page.getByRole('button', { name: /previous month/i }).click();
    await expect(page).toHaveURL(/month=\d{4}-\d{2}/);

    // Previous month has 0 expenses
    const kpiExpense = page.getByTestId('kpi-expense');
    await expect(kpiExpense.getByText('$0.00')).toBeVisible();
    await expect(
      page.getByText(/no transactions for this month yet/i),
    ).toBeVisible();

    // 4. Click "This month"
    const thisMonthBtn = page.getByRole('button', { name: /this month/i });
    await thisMonthBtn.click();

    // Current month transaction is visible again
    await expect(page.getByText('Monthly dinner')).toBeVisible();

    // 5. Click "View all transactions" link -> navigates to /app/transactions
    const viewAllLink = page.getByTestId('view-all-transactions-link');
    await viewAllLink.click();
    await page.waitForURL(/\/app\/transactions/);
    await expect(page.getByTestId('transactions-page')).toBeVisible();
    await expect(page.getByText('Monthly dinner')).toBeVisible();
  });

  test('Scenario 4: Mobile 360px viewport usability and FAB interaction', async ({
    page,
  }) => {
    const user = createUniqueTestUser('dashmobile');

    // Register & onboard
    await registerTestUser(page, user);

    // Set mobile viewport
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/app/dashboard');

    // Verify no horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
      );
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Mobile FAB is visible
    const mobileFab = page.getByTestId('mobile-add-fab');
    await expect(mobileFab).toBeVisible();

    // Click FAB to open quick transaction form
    await mobileFab.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('heading', {
        name: /new transaction|новая операция/i,
      }),
    ).toBeVisible();

    // Fill and submit form on mobile
    await page.getByTestId('transaction-amount-input').fill('30');
    await page.getByTestId('transaction-category-select').click();
    await page.getByRole('option', { name: /food & groceries/i }).click();
    await page.getByTestId('transaction-note-input').fill('Mobile coffee');
    await page.getByTestId('transaction-submit-button').click();

    // Item is displayed on dashboard
    await expect(page.getByText('Mobile coffee')).toBeVisible();
  });
});
