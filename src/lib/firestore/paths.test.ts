import { describe, it, expect } from 'vitest';
import {
  accountDoc,
  accountsCol,
  budgetDoc,
  budgetsCol,
  categoryDoc,
  categoriesCol,
  transactionDoc,
  transactionsCol,
  userDoc,
} from './paths';

describe('firestore paths', () => {
  const uid = 'user-test-123';

  describe('valid paths generation', () => {
    it('creates correct userDoc reference', () => {
      const ref = userDoc(uid);
      expect(ref.path).toBe(`users/${uid}`);
    });

    it('creates correct accountsCol and accountDoc references', () => {
      const colRef = accountsCol(uid);
      expect(colRef.path).toBe(`users/${uid}/accounts`);

      const docRef = accountDoc(uid, 'acc-card');
      expect(docRef.path).toBe(`users/${uid}/accounts/acc-card`);
    });

    it('creates correct categoriesCol and categoryDoc references', () => {
      const colRef = categoriesCol(uid);
      expect(colRef.path).toBe(`users/${uid}/categories`);

      const docRef = categoryDoc(uid, 'cat-food');
      expect(docRef.path).toBe(`users/${uid}/categories/cat-food`);
    });

    it('creates correct transactionsCol and transactionDoc references', () => {
      const colRef = transactionsCol(uid);
      expect(colRef.path).toBe(`users/${uid}/transactions`);

      const docRef = transactionDoc(uid, 'tx-999');
      expect(docRef.path).toBe(`users/${uid}/transactions/tx-999`);
    });

    it('creates correct budgetsCol and budgetDoc references', () => {
      const colRef = budgetsCol(uid);
      expect(colRef.path).toBe(`users/${uid}/budgets`);

      const docRef = budgetDoc(uid, '2026-09_cat-food');
      expect(docRef.path).toBe(`users/${uid}/budgets/2026-09_cat-food`);
    });

    it('trims leading and trailing whitespace from IDs', () => {
      expect(userDoc('  user-1  ').path).toBe('users/user-1');
      expect(accountDoc(' user-1 ', ' acc-1 ').path).toBe(
        'users/user-1/accounts/acc-1',
      );
      expect(categoryDoc(' user-1 ', ' cat-1 ').path).toBe(
        'users/user-1/categories/cat-1',
      );
      expect(transactionDoc(' user-1 ', ' tx-1 ').path).toBe(
        'users/user-1/transactions/tx-1',
      );
      expect(budgetDoc(' user-1 ', ' b-1 ').path).toBe(
        'users/user-1/budgets/b-1',
      );
    });
  });

  describe('input validation errors', () => {
    it('throws error for invalid uid', () => {
      expect(() => userDoc('')).toThrowError(/Invalid uid/);
      expect(() => accountsCol('   ')).toThrowError(/Invalid uid/);
      expect(() => categoriesCol('')).toThrowError(/Invalid uid/);
      expect(() => transactionsCol('  \t ')).toThrowError(/Invalid uid/);
      expect(() => budgetsCol('')).toThrowError(/Invalid uid/);

      // Non-string types
      // @ts-expect-error testing invalid runtime input
      expect(() => userDoc(null)).toThrowError(/Invalid uid/);
      // @ts-expect-error testing invalid runtime input
      expect(() => userDoc(undefined)).toThrowError(/Invalid uid/);
      // @ts-expect-error testing invalid runtime input
      expect(() => userDoc(12345)).toThrowError(/Invalid uid/);
    });

    it('throws error for invalid document IDs', () => {
      expect(() => accountDoc(uid, '')).toThrowError(/Invalid accountId/);
      expect(() => accountDoc(uid, '   ')).toThrowError(/Invalid accountId/);

      expect(() => categoryDoc(uid, '')).toThrowError(/Invalid categoryId/);
      expect(() => categoryDoc(uid, ' \n ')).toThrowError(/Invalid categoryId/);

      expect(() => transactionDoc(uid, '')).toThrowError(/Invalid txId/);
      expect(() => transactionDoc(uid, '   ')).toThrowError(/Invalid txId/);

      expect(() => budgetDoc(uid, '')).toThrowError(/Invalid budgetId/);
      expect(() => budgetDoc(uid, '   ')).toThrowError(/Invalid budgetId/);
    });
  });
});
