import { serverTimestamp } from 'firebase/firestore';

export const DELETE_FIELD = Symbol('DELETE_FIELD');
export type DeleteField = typeof DELETE_FIELD;

export type DocOverrides = Record<string, unknown>;

function applyOverrides<T extends Record<string, unknown>>(
  base: T,
  overrides?: DocOverrides,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  if (!overrides) return result;

  for (const [key, val] of Object.entries(overrides)) {
    if (val === DELETE_FIELD) {
      delete result[key];
    } else {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Valid Profile document builder according to docs/02-data-model.md §3.1 & §11.
 */
export function validProfile(
  overrides?: DocOverrides,
): Record<string, unknown> {
  const base = {
    baseCurrency: 'USD',
    locale: 'en',
    theme: 'system',
    schemaVersion: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  return applyOverrides(base, overrides);
}

/**
 * Valid Account document builder according to docs/02-data-model.md §3.2 & §11.
 */
export function validAccount(
  overrides?: DocOverrides,
): Record<string, unknown> {
  const base = {
    type: 'card',
    balance: 0,
    initialBalance: 0,
    archived: false,
    name: 'Main Card',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  return applyOverrides(base, overrides);
}

/**
 * Valid Category document builder according to docs/02-data-model.md §3.3 & §11.
 */
export function validCategory(
  overrides?: DocOverrides,
): Record<string, unknown> {
  const base = {
    type: 'expense',
    icon: 'shopping-bag',
    color: 'blue',
    archived: false,
    name: 'Groceries',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  return applyOverrides(base, overrides);
}

/**
 * Valid Transaction document builder according to docs/02-data-model.md §3.4 & §11.
 */
export function validTransaction(
  overrides?: DocOverrides,
): Record<string, unknown> {
  const base = {
    type: 'expense',
    amount: 1000,
    accountId: 'acc1',
    categoryId: 'cat1',
    date: '2026-05-15',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  return applyOverrides(base, overrides);
}

/**
 * Valid Budget document builder according to docs/02-data-model.md §3.5 & §11.
 */
export function validBudget(overrides?: DocOverrides): Record<string, unknown> {
  const base = {
    categoryId: 'cat1',
    month: '2026-05',
    limit: 50000,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  return applyOverrides(base, overrides);
}
