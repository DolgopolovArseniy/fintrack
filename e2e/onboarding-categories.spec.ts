/// <reference lib="dom" />
import { expect, test } from '@playwright/test';
import { checkA11y } from './helpers/a11y';
import {
  clearAuthEmulator,
  clearFirestoreEmulator,
  createUniqueTestUser,
} from './helpers/auth';

test.describe('F04 — Onboarding & Categories E2E flows', () => {
  test.beforeEach(async () => {
    await clearAuthEmulator();
    await clearFirestoreEmulator();
  });

  test('Scenario 1: Full onboarding batch creation, guard redirects and dashboard transition', async ({
    page,
  }) => {
    const user = createUniqueTestUser('onboard');

    // 1. Register new user
    await page.goto('/register');
    await page.getByLabel(/name|имя/i).fill(user.displayName);
    await page.getByLabel(/email/i).fill(user.email);
    await page.locator('input[name="password"]').fill(user.password);
    await page
      .getByRole('button', { name: /create account|зарегистрироваться/i })
      .click();

    // Must be redirected to /onboarding because profile does not exist yet (AC2)
    await page.waitForURL(/\/onboarding/);
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(
      page.getByRole('heading', {
        name: /welcome to fintrack|добро пожаловать/i,
      }),
    ).toBeVisible();

    // Check accessibility on /onboarding
    await checkA11y(page);

    // Attempting to visit /app/dashboard while needsOnboarding redirects back to /onboarding (AC2)
    await page.goto('/app/dashboard');
    await page.waitForURL(/\/onboarding/);
    await expect(page).toHaveURL(/\/onboarding/);

    // 2. Submit onboarding form with EUR currency (AC1)
    const currencySelect = page.getByTestId('onboarding-currency-select');
    await currencySelect.click();
    await page.getByRole('option', { name: /eur|евро/i }).click();

    await page.getByTestId('onboarding-submit-button').click();

    // After successful batch write, transitions to dashboard (AC1)
    await page.waitForURL(/\/app\/dashboard/);
    await expect(page).toHaveURL(/\/app\/dashboard/);
    await expect(
      page.getByRole('navigation', { name: /main navigation/i }),
    ).toBeVisible();

    // 3. Visiting /onboarding after profile is ready redirects to dashboard (AC3)
    await page.goto('/onboarding');
    await page.waitForURL(/\/app\/dashboard/);
    await expect(page).toHaveURL(/\/app\/dashboard/);
  });

  test('Scenario 2: Default categories display, tabs navigation, and a11y compliance', async ({
    page,
  }) => {
    const user = createUniqueTestUser('catview');

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

    // Navigate to /app/categories
    await page.goto('/app/categories');
    await expect(
      page.getByRole('heading', { name: /categories|категории/i }),
    ).toBeVisible();

    // Default 8 expense categories exist (AC1, AC4)
    const expenseTab = page.getByTestId('expense-tab');
    await expect(expenseTab).toContainText('8');
    await expect(page.getByText('Food & Groceries')).toBeVisible();
    await expect(page.getByText('Transportation')).toBeVisible();

    // Switch to Income tab (AC4)
    const incomeTab = page.getByTestId('income-tab');
    await expect(incomeTab).toContainText('3');
    await incomeTab.click();
    await expect(page.getByText('Salary')).toBeVisible();
    await expect(page.getByText('Food & Groceries')).toHaveCount(0);

    // Switch back to Expenses tab
    await expenseTab.click();
    await expect(page.getByText('Food & Groceries')).toBeVisible();

    // Check accessibility on /app/categories (Light theme)
    await checkA11y(page);

    // Check accessibility on /app/categories (Dark theme)
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await checkA11y(page);
  });

  test('Scenario 3: Category CRUD lifecycle, duplicate validation, archive, and unarchive', async ({
    page,
  }) => {
    const user = createUniqueTestUser('catcrud');

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

    await page.goto('/app/categories');

    // 1. Open create dialog (AC5)
    await page.getByTestId('add-category-button').click();
    const createDialog = page.getByRole('dialog');
    await expect(createDialog).toBeVisible();
    await expect(
      createDialog.getByRole('heading', {
        name: /new category|новая категория/i,
      }),
    ).toBeVisible();

    // 2. Duplicate validation (AC6)
    const nameInput = page.locator('#category-name-input');
    await nameInput.fill('food & groceries');
    await page.getByRole('button', { name: /save|сохранить/i }).click();

    // Duplicate error appears
    await expect(page.getByTestId('category-name-error')).toBeVisible();

    // 3. Successful creation of custom category (AC5)
    await nameInput.fill('Coffee & Bakery');
    await page.getByRole('button', { name: /save|сохранить/i }).click();

    // Dialog closes and new category appears in list
    await expect(page.getByText('Coffee & Bakery')).toBeVisible();

    // 4. Edit category (AC7)
    const categoryItem = page
      .locator('[data-testid^="category-item-"]')
      .filter({
        hasText: 'Coffee & Bakery',
      });
    await expect(categoryItem).toBeVisible();

    // Open actions menu
    const actionsTrigger = categoryItem.locator('button[aria-label]');
    await actionsTrigger.click();

    const editMenuItem = page.getByRole('menuitem', {
      name: /edit|редактировать/i,
    });
    await editMenuItem.click();

    // Type must be disabled in edit mode (AC7)
    const expenseTypeBtn = page
      .getByRole('button', { name: /expenses|расходы/i })
      .first();
    await expect(expenseTypeBtn).toBeDisabled();

    // Update name
    const editNameInput = page.locator('#category-name-input');
    await editNameInput.fill('Specialty Coffee');
    await page.getByRole('button', { name: /save|сохранить/i }).click();

    // Updated name is shown
    await expect(page.getByText('Specialty Coffee')).toBeVisible();
    await expect(page.getByText('Coffee & Bakery')).toHaveCount(0);

    // 5. Archive category (AC8)
    const updatedItem = page.locator('[data-testid^="category-item-"]').filter({
      hasText: 'Specialty Coffee',
    });
    const updatedActionsTrigger = updatedItem.locator('button[aria-label]');
    await updatedActionsTrigger.click();

    const archiveMenuItem = page.getByRole('menuitem', {
      name: /archive|архивировать/i,
    });
    await archiveMenuItem.click();

    // Confirm dialog
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog).toBeVisible();
    const confirmArchiveBtn = confirmDialog.getByRole('button', {
      name: /archive|архивировать/i,
    });
    await confirmArchiveBtn.click();

    // Category should be hidden from active list
    await expect(page.getByText('Specialty Coffee')).toHaveCount(0);

    // 6. Show archived and Restore (AC8, AC9)
    const showArchivedSwitch = page.getByTestId('show-archived-switch');
    await showArchivedSwitch.click();

    // Now archived category appears with Archived indicator
    const archivedItem = page
      .locator('[data-testid^="category-item-"]')
      .filter({
        hasText: 'Specialty Coffee',
      });
    await expect(archivedItem).toBeVisible();
    await expect(archivedItem.getByText(/archived|в архиве/i)).toBeVisible();

    // Restore category
    const archivedActionsTrigger = archivedItem.locator('button[aria-label]');
    await archivedActionsTrigger.click();

    const restoreMenuItem = page.getByRole('menuitem', {
      name: /restore|восстановить/i,
    });
    await restoreMenuItem.click();

    // After restoring, archived indicator is removed
    await expect(archivedItem.getByText(/archived|в архиве/i)).toHaveCount(0);
  });

  test('Scenario 4: Mobile 360px viewport usability and drawer responsiveness', async ({
    page,
  }) => {
    const user = createUniqueTestUser('catmob');

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
    await page.goto('/app/categories');

    // Confirm no horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
      );
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Open Add Category on mobile -> Drawer opens
    await page.getByTestId('add-category-button').click();
    const drawerOrDialog = page.locator('[role="dialog"]');
    await expect(drawerOrDialog).toBeVisible();

    // Close dialog
    await page.getByRole('button', { name: /cancel|отмена/i }).click();
    await expect(drawerOrDialog).toHaveCount(0);
  });
});
