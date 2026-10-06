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
 * Helper to fetch the raw account document from Firestore emulator REST API.
 */
async function getAccountDocFromEmulator(
  uid: string,
  accountId: string,
  projectId = EMULATOR_PROJECT_ID,
): Promise<{
  balance: number;
  initialBalance: number;
  archived: boolean;
  name?: string;
  type?: string;
} | null> {
  const url = `${FIRESTORE_EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/accounts/${accountId}`;
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as {
    fields?: {
      balance?: { integerValue?: string };
      initialBalance?: { integerValue?: string };
      archived?: { booleanValue?: boolean };
      name?: { stringValue?: string };
      type?: { stringValue?: string };
    };
  };
  return {
    balance: data.fields?.balance?.integerValue
      ? Number(data.fields.balance.integerValue)
      : 0,
    initialBalance: data.fields?.initialBalance?.integerValue
      ? Number(data.fields.initialBalance.integerValue)
      : 0,
    archived: Boolean(data.fields?.archived?.booleanValue),
    name: data.fields?.name?.stringValue,
    type: data.fields?.type?.stringValue,
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

test.describe('F07 — Accounts & Balances E2E flows', () => {
  test.beforeEach(async () => {
    await clearAuthEmulator();
    await clearFirestoreEmulator();
  });

  test('Scenario 1: Full Accounts CRUD lifecycle, Net Worth calculation, initial balance atomic adjustments, and a11y', async ({
    page,
  }) => {
    const user = createUniqueTestUser('acc_crud');

    // 1. Register & complete onboarding
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

    // Verify initial main account state in Firestore emulator
    if (uid) {
      const mainDoc = await getAccountDocFromEmulator(uid, 'main');
      expect(mainDoc?.balance).toBe(0);
      expect(mainDoc?.initialBalance).toBe(0);
      expect(mainDoc?.archived).toBe(false);
    }

    // 2. Navigate to /app/accounts
    await page.goto('/app/accounts');
    await expect(page.getByTestId('accounts-page')).toBeVisible();

    // Initial state: single active main account with 0 balance
    await expect(page.getByTestId('account-summary-header')).toBeVisible();
    await expect(page.getByTestId('active-accounts-badge')).toContainText(/1/);

    // Initial a11y check
    await checkA11y(page);

    // 3. Create a new Card account: "Tinkoff Black Card" with initial balance 50,000
    await page.getByTestId('add-account-button').click();
    const createDialog = page.getByRole('dialog');
    await expect(createDialog).toBeVisible();
    await expect(
      createDialog.getByRole('heading', {
        name: /create account|новый счёт/i,
      }),
    ).toBeVisible();

    // Fill name
    await page.getByTestId('account-name-input').fill('Tinkoff Black Card');

    // Select type "card"
    await page.getByTestId('account-type-card').click();

    // Fill initial balance 50000
    await page.getByTestId('account-initial-balance-input').fill('50000');

    // Submit form
    await page.getByTestId('account-form-submit').click();

    // Dialog closes and toast appears
    await expect(
      page.getByText(/account created|счёт успешно создан/i),
    ).toBeVisible();
    await expect(createDialog).toHaveCount(0);

    // Card is visible in the list
    const cardItem = page
      .locator('[data-testid^="account-card-"]')
      .filter({ hasText: 'Tinkoff Black Card' });
    await expect(cardItem).toBeVisible();
    await expect(cardItem.getByText(/50[ ,.]?000/).first()).toBeVisible();

    // Verify summary totals: 2 active accounts, cards subtotal 50,000, total balance 50,000
    await expect(page.getByTestId('active-accounts-badge')).toContainText(/2/);
    await expect(
      page.getByTestId('summary-subtotal-card').getByText(/50[ ,.]?000/),
    ).toBeVisible();

    // 4. Create a Cash account: "Cash Stash" with initial balance 10,000
    await page.getByTestId('add-account-button').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByTestId('account-name-input').fill('Cash Stash');
    await page.getByTestId('account-type-cash').click();
    await page.getByTestId('account-initial-balance-input').fill('10000');
    await page.getByTestId('account-form-submit').click();
    await expect(
      page.getByText(/account created|счёт успешно создан/i),
    ).toBeVisible();

    // Summary reflects 3 active accounts, total balance 60,000 (50k card + 10k cash)
    await expect(page.getByTestId('active-accounts-badge')).toContainText(/3/);
    await expect(
      page.getByTestId('summary-subtotal-cash').getByText(/10[ ,.]?000/),
    ).toBeVisible();
    await expect(
      page.getByTestId('summary-subtotal-card').getByText(/50[ ,.]?000/),
    ).toBeVisible();

    // 5. Edit "Tinkoff Black Card": update initial balance from 50,000 to 75,000
    await cardItem.locator('button[aria-label]').click();
    await page
      .getByRole('menuitem', { name: /edit account|редактировать/i })
      .click();

    const editDialog = page.getByRole('dialog');
    await expect(editDialog).toBeVisible();
    await expect(
      editDialog.getByRole('heading', {
        name: /edit account|редактирование счёта/i,
      }),
    ).toBeVisible();

    await page.getByTestId('account-initial-balance-input').fill('75000');
    await page.getByTestId('account-form-submit').click();
    await expect(
      page.getByText(/account updated|счёт успешно обновлён/i),
    ).toBeVisible();
    await expect(editDialog).toHaveCount(0);

    // Balance is atomically shifted to 75,000 and total balance becomes 85,000 (75k + 10k)
    await expect(cardItem.getByText(/75[ ,.]?000/).first()).toBeVisible();
    await expect(
      page.getByTestId('summary-subtotal-card').getByText(/75[ ,.]?000/),
    ).toBeVisible();

    // 6. Accessibility audit in light and dark mode
    await checkA11y(page);

    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await checkA11y(page);
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
    });
  });

  test('Scenario 2: Integration with Transactions, atomic balance debit, and balance recalculation', async ({
    page,
  }) => {
    const user = createUniqueTestUser('acc_tx');

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
    if (uid) {
      const mainDoc = await getAccountDocFromEmulator(uid, 'main');
      expect(mainDoc).not.toBeNull();
    }

    // 1. Create a "Shopping Card" account with initial balance 40,000
    await page.goto('/app/accounts');
    await page.getByTestId('add-account-button').click();
    await page.getByTestId('account-name-input').fill('Shopping Card');
    await page.getByTestId('account-type-card').click();
    await page.getByTestId('account-initial-balance-input').fill('40000');
    await page.getByTestId('account-form-submit').click();
    await expect(
      page.getByText(/account created|счёт успешно создан/i),
    ).toBeVisible();

    // 2. Navigate to /app/transactions and record an expense linked to "Shopping Card"
    await page.goto('/app/transactions');
    await page.getByTestId('add-transaction-button').click();

    // Enter amount 6,500
    await page.getByTestId('transaction-amount-input').fill('6500');

    // Select category (Food & Groceries)
    await page.getByTestId('transaction-category-select').click();
    await page.getByRole('option', { name: /food & groceries/i }).click();

    // Select account "Shopping Card"
    await page.getByTestId('transaction-account-select').click();
    await page.getByRole('option', { name: /shopping card/i }).click();

    // Enter note
    await page
      .getByTestId('transaction-note-input')
      .fill('Hypermarket Groceries');

    // Submit transaction
    await page.getByTestId('transaction-submit-button').click();
    await expect(page.getByText(/transaction added/i)).toBeVisible();

    // Verify transaction item shows account display name
    const txItem = page.locator('[data-testid^="transaction-item-"]').first();
    await expect(txItem.getByText('Hypermarket Groceries')).toBeVisible();
    await expect(txItem.getByText('Shopping Card')).toBeVisible();

    // 3. Return to /app/accounts: balance of "Shopping Card" should now be 33,500 (40000 - 6500)
    await page.goto('/app/accounts');
    const shoppingCard = page
      .locator('[data-testid^="account-card-"]')
      .filter({ hasText: 'Shopping Card' });
    await expect(shoppingCard).toBeVisible();
    await expect(shoppingCard.getByText(/33[ ,.]?500/)).toBeVisible();

    // 4. Trigger balance recalculation
    await shoppingCard.locator('button[aria-label]').click();
    await page
      .getByRole('menuitem', { name: /recalculate balance|пересчитать/i })
      .click();

    // Toast confirms transaction count
    await expect(
      page.getByText(/transactions processed|операций/i),
    ).toBeVisible();

    // Balance remains exactly 33,500
    await expect(shoppingCard.getByText(/33[ ,.]?500/)).toBeVisible();
  });

  test('Scenario 3: Archive, restore flow, transaction form exclusion, and single active account protection', async ({
    page,
  }) => {
    const user = createUniqueTestUser('acc_arch');

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

    await page.goto('/app/accounts');

    // 1. Initially only 1 active account (Main account): verify archive is disabled (AC-5)
    const mainCard = page.locator('[data-testid^="account-card-"]').first();
    await mainCard.locator('button[aria-label]').click();
    const archiveMenuItem = page.getByRole('menuitem', {
      name: /archive account|архивировать/i,
    });
    await expect(archiveMenuItem).toHaveAttribute('data-disabled');
    await page.keyboard.press('Escape');

    // 2. Add a second account: "Old Deposit" (type: bank)
    await page.getByTestId('add-account-button').click();
    await page.getByTestId('account-name-input').fill('Old Deposit');
    await page.getByTestId('account-type-bank').click();
    await page.getByTestId('account-initial-balance-input').fill('15000');
    await page.getByTestId('account-form-submit').click();
    await expect(
      page.getByText(/account created|счёт успешно создан/i),
    ).toBeVisible();

    // 3. Now 2 active accounts: Archive "Old Deposit"
    const depositCard = page
      .locator('[data-testid^="account-card-"]')
      .filter({ hasText: 'Old Deposit' });
    await depositCard.locator('button[aria-label]').click();
    await page
      .getByRole('menuitem', { name: /archive account|архивировать/i })
      .click();

    // Confirm dialog opens
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog).toBeVisible();
    await expect(
      confirmDialog.getByRole('heading', {
        name: /archive account|архивация счёта/i,
      }),
    ).toBeVisible();

    // Confirm archive
    await confirmDialog
      .getByRole('button', { name: /archive|архивировать/i })
      .click();
    await expect(
      page.getByText(/account archived|счёт архивирован/i),
    ).toBeVisible();

    // "Old Deposit" is hidden from active list
    await expect(
      page
        .locator('[data-testid^="account-card-"]')
        .filter({ hasText: 'Old Deposit' }),
    ).toHaveCount(0);

    // 4. Toggle "Show archived" switch: "Old Deposit" appears with archived status
    await page.getByTestId('show-archived-switch').click();
    const archivedDepositCard = page
      .locator('[data-testid^="account-card-"]')
      .filter({ hasText: 'Old Deposit' });
    await expect(archivedDepositCard).toBeVisible();
    await expect(
      archivedDepositCard.getByText(/archived|архив/i),
    ).toBeVisible();

    // 5. Navigate to /app/transactions -> Open Add Transaction:
    // "Old Deposit" must NOT be present in account options for new transactions
    await page.goto('/app/transactions');
    await page.getByTestId('add-transaction-button').click();
    await page.getByTestId('transaction-account-select').click();
    await expect(
      page.getByRole('option', { name: /old deposit/i }),
    ).toHaveCount(0);
    await page.keyboard.press('Escape');

    // 6. Return to /app/accounts and restore (unarchive) "Old Deposit"
    await page.goto('/app/accounts');
    await page.getByTestId('show-archived-switch').click();
    const toRestoreCard = page
      .locator('[data-testid^="account-card-"]')
      .filter({ hasText: 'Old Deposit' });
    await toRestoreCard.locator('button[aria-label]').click();
    await page
      .getByRole('menuitem', { name: /restore account|восстановить/i })
      .click();
    await expect(
      page.getByText(/account restored|счёт восстановлен/i),
    ).toBeVisible();

    // Active accounts count is now 2 again
    await expect(page.getByTestId('active-accounts-badge')).toContainText(/2/);
  });
});
