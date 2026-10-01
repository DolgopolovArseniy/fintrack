import type { UserProfile, UserProfileInput } from '@/features/auth';
import type { Category, CategoryInput } from '@/features/categories';
import type { Account, AccountInput } from '@/features/accounts';
import type { Transaction, TransactionInput } from '@/features/transactions';
import type { Budget, BudgetInput } from '@/features/budgets';
import type { BalanceTx } from '@/lib/balance';
import type { AggTx } from '@/lib/aggregations';

let sequenceCounters: Record<string, number> = {};

/**
 * Generates an auto-incrementing identifier with the specified prefix.
 * Example: nextId('tx') -> 'tx-1', 'tx-2', ...
 */
export function nextId(prefix: string): string {
  const current = sequenceCounters[prefix] ?? 0;
  const next = current + 1;
  sequenceCounters[prefix] = next;
  return `${prefix}-${next}`;
}

/**
 * Resets all auto-incrementing ID sequence counters.
 * Useful between test runs or suites to restore deterministic identifiers.
 */
export function resetFactorySequences(): void {
  sequenceCounters = {};
}

/**
 * Builds a valid UserProfileInput object with optional field overrides.
 */
export function buildUserProfileInput(
  overrides?: Partial<UserProfileInput>,
): UserProfileInput {
  return {
    baseCurrency: 'USD',
    locale: 'en',
    theme: 'system',
    schemaVersion: 1,
    displayName: 'Test User',
    ...overrides,
  };
}

/**
 * Builds a valid UserProfile document object with optional field overrides.
 */
export function buildUserProfile(
  overrides?: Partial<UserProfile>,
): UserProfile {
  return {
    id: overrides?.id ?? nextId('user'),
    baseCurrency: 'USD',
    locale: 'en',
    theme: 'system',
    schemaVersion: 1,
    displayName: 'Test User',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

/**
 * Builds a valid CategoryInput object with optional field overrides.
 */
export function buildCategoryInput(
  overrides?: Partial<CategoryInput>,
): CategoryInput {
  return {
    type: 'expense',
    name: 'Groceries',
    icon: 'shopping-cart',
    color: 'sky',
    archived: false,
    ...overrides,
  };
}

/**
 * Builds a valid Category document object with optional field overrides.
 */
export function buildCategory(overrides?: Partial<Category>): Category {
  return {
    id: overrides?.id ?? nextId('cat'),
    type: 'expense',
    name: 'Groceries',
    icon: 'shopping-cart',
    color: 'sky',
    archived: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

/**
 * Builds a valid AccountInput object with optional field overrides.
 */
export function buildAccountInput(
  overrides?: Partial<AccountInput>,
): AccountInput {
  return {
    type: 'bank',
    name: 'Main Checking',
    initialBalance: 100000,
    balance: 100000,
    archived: false,
    ...overrides,
  };
}

/**
 * Builds a valid Account document object with optional field overrides.
 */
export function buildAccount(overrides?: Partial<Account>): Account {
  return {
    id: overrides?.id ?? nextId('acc'),
    type: 'bank',
    name: 'Main Checking',
    balance: 100000,
    initialBalance: 100000,
    archived: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

/**
 * Builds a valid TransactionInput object with optional field overrides.
 */
export function buildTransactionInput(
  overrides?: Partial<TransactionInput>,
): TransactionInput {
  return {
    type: 'expense',
    amount: 2500,
    accountId: 'acc-1',
    categoryId: 'cat-1',
    date: '2026-09-30',
    note: 'Weekly supermarket trip',
    tags: ['food', 'groceries'],
    ...overrides,
  };
}

/**
 * Builds a valid Transaction document object with optional field overrides.
 */
export function buildTransaction(
  overrides?: Partial<Transaction>,
): Transaction {
  return {
    id: overrides?.id ?? nextId('tx'),
    type: 'expense',
    amount: 2500,
    accountId: 'acc-1',
    categoryId: 'cat-1',
    date: '2026-09-30',
    note: 'Weekly supermarket trip',
    tags: ['food', 'groceries'],
    createdAt: new Date('2026-09-30T10:00:00.000Z'),
    updatedAt: new Date('2026-09-30T10:00:00.000Z'),
    ...overrides,
  };
}

/**
 * Builds a valid BudgetInput object with optional field overrides.
 */
export function buildBudgetInput(
  overrides?: Partial<BudgetInput>,
): BudgetInput {
  return {
    categoryId: 'cat-1',
    month: '2026-09',
    limit: 50000,
    ...overrides,
  };
}

/**
 * Builds a valid Budget document object with optional field overrides.
 * Note: budget document IDs must match the `${month}_${categoryId}` schema refinement.
 * If categoryId or month is overridden without an explicit id, id is automatically kept in sync.
 */
export function buildBudget(overrides?: Partial<Budget>): Budget {
  const month = overrides?.month ?? '2026-09';
  const categoryId = overrides?.categoryId ?? 'cat-1';
  const id = overrides?.id ?? `${month}_${categoryId}`;

  return {
    categoryId,
    month,
    limit: 50000,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
    id,
  };
}

/**
 * Builds a valid BalanceTx object for testing balance deltas.
 */
export function buildBalanceTx(overrides?: Partial<BalanceTx>): BalanceTx {
  return {
    type: 'expense',
    amount: 2500,
    accountId: 'acc-1',
    ...overrides,
  };
}

/**
 * Builds a valid AggTx object for testing aggregations.
 */
export function buildAggTx(overrides?: Partial<AggTx>): AggTx {
  return {
    type: 'expense',
    amount: 2500,
    categoryId: 'cat-1',
    date: '2026-09-30',
    ...overrides,
  };
}
