import { beforeEach, describe, expect, it } from 'vitest';
import { userProfileInputSchema, userProfileSchema } from '@/features/auth';
import { categoryInputSchema, categorySchema } from '@/features/categories';
import { accountInputSchema, accountSchema } from '@/features/accounts';
import {
  transactionInputSchema,
  transactionSchema,
} from '@/features/transactions';
import { budgetInputSchema, budgetSchema } from '@/features/budgets';
import {
  buildAccount,
  buildAccountInput,
  buildAggTx,
  buildBalanceTx,
  buildBudget,
  buildBudgetInput,
  buildCategory,
  buildCategoryInput,
  buildTransaction,
  buildTransactionInput,
  buildUserProfile,
  buildUserProfileInput,
  nextId,
  resetFactorySequences,
} from './factories';

describe('test factories', () => {
  beforeEach(() => {
    resetFactorySequences();
  });

  describe('ID generator & sequences', () => {
    it('generates sequential IDs per prefix', () => {
      expect(nextId('tx')).toBe('tx-1');
      expect(nextId('tx')).toBe('tx-2');
      expect(nextId('acc')).toBe('acc-1');
      expect(nextId('tx')).toBe('tx-3');
    });

    it('resets sequences with resetFactorySequences', () => {
      expect(nextId('tx')).toBe('tx-1');
      resetFactorySequences();
      expect(nextId('tx')).toBe('tx-1');
    });
  });

  describe('UserProfile factories', () => {
    it('produces valid UserProfileInput', () => {
      const input = buildUserProfileInput();
      const parsed = userProfileInputSchema.parse(input);
      expect(parsed.baseCurrency).toBe('USD');
      expect(parsed.locale).toBe('en');
    });

    it('produces valid UserProfileInput with overrides', () => {
      const input = buildUserProfileInput({
        baseCurrency: 'EUR',
        locale: 'ru',
        displayName: 'Custom User',
      });
      const parsed = userProfileInputSchema.parse(input);
      expect(parsed.baseCurrency).toBe('EUR');
      expect(parsed.locale).toBe('ru');
      expect(parsed.displayName).toBe('Custom User');
    });

    it('produces valid UserProfile document', () => {
      const doc = buildUserProfile();
      const parsed = userProfileSchema.parse(doc);
      expect(parsed.id).toBe('user-1');
      expect(parsed.createdAt).toBeInstanceOf(Date);
      expect(parsed.updatedAt).toBeInstanceOf(Date);
    });

    it('produces valid UserProfile document with overrides', () => {
      const customDate = new Date('2026-05-15T12:00:00.000Z');
      const doc = buildUserProfile({
        id: 'user-custom',
        theme: 'dark',
        createdAt: customDate,
      });
      const parsed = userProfileSchema.parse(doc);
      expect(parsed.id).toBe('user-custom');
      expect(parsed.theme).toBe('dark');
      expect(parsed.createdAt).toEqual(customDate);
    });
  });

  describe('Category factories', () => {
    it('produces valid CategoryInput', () => {
      const input = buildCategoryInput();
      const parsed = categoryInputSchema.parse(input);
      expect(parsed.name).toBe('Groceries');
      expect(parsed.color).toBe('sky');
    });

    it('produces valid CategoryInput with overrides', () => {
      const input = buildCategoryInput({
        type: 'income',
        name: 'Salary',
        color: 'emerald',
      });
      const parsed = categoryInputSchema.parse(input);
      expect(parsed.type).toBe('income');
      expect(parsed.name).toBe('Salary');
      expect(parsed.color).toBe('emerald');
    });

    it('produces valid Category document', () => {
      const doc = buildCategory();
      const parsed = categorySchema.parse(doc);
      expect(parsed.id).toBe('cat-1');
      expect(parsed.name).toBe('Groceries');
    });

    it('produces valid Category document with systemKey instead of name', () => {
      const doc = buildCategory({
        name: undefined,
        systemKey: 'system_salary',
      });
      const parsed = categorySchema.parse(doc);
      expect(parsed.systemKey).toBe('system_salary');
      expect(parsed.name).toBeUndefined();
    });
  });

  describe('Account factories', () => {
    it('produces valid AccountInput', () => {
      const input = buildAccountInput();
      const parsed = accountInputSchema.parse(input);
      expect(parsed.type).toBe('bank');
      expect(parsed.initialBalance).toBe(100000);
    });

    it('produces valid AccountInput with overrides', () => {
      const input = buildAccountInput({
        type: 'card',
        name: 'Credit Card',
        initialBalance: 500000,
      });
      const parsed = accountInputSchema.parse(input);
      expect(parsed.type).toBe('card');
      expect(parsed.name).toBe('Credit Card');
      expect(parsed.initialBalance).toBe(500000);
    });

    it('produces valid Account document', () => {
      const doc = buildAccount();
      const parsed = accountSchema.parse(doc);
      expect(parsed.id).toBe('acc-1');
      expect(parsed.balance).toBe(100000);
    });

    it('produces valid Account document with systemKey', () => {
      const doc = buildAccount({
        name: undefined,
        systemKey: 'default_cash',
      });
      const parsed = accountSchema.parse(doc);
      expect(parsed.systemKey).toBe('default_cash');
    });
  });

  describe('Transaction factories', () => {
    it('produces valid TransactionInput', () => {
      const input = buildTransactionInput();
      const parsed = transactionInputSchema.parse(input);
      expect(parsed.type).toBe('expense');
      expect(parsed.amount).toBe(2500);
      expect(parsed.date).toBe('2026-09-30');
    });

    it('produces valid TransactionInput with overrides', () => {
      const input = buildTransactionInput({
        type: 'income',
        amount: 150000,
        note: 'Freelance payment',
        tags: ['client', 'design'],
      });
      const parsed = transactionInputSchema.parse(input);
      expect(parsed.type).toBe('income');
      expect(parsed.amount).toBe(150000);
      expect(parsed.note).toBe('Freelance payment');
      expect(parsed.tags).toEqual(['client', 'design']);
    });

    it('produces valid Transaction document', () => {
      const doc = buildTransaction();
      const parsed = transactionSchema.parse(doc);
      expect(parsed.id).toBe('tx-1');
      expect(parsed.createdAt).toBeInstanceOf(Date);
      expect(parsed.updatedAt).toBeInstanceOf(Date);
    });

    it('increments transaction IDs sequentially', () => {
      const doc1 = buildTransaction();
      const doc2 = buildTransaction();
      expect(doc1.id).toBe('tx-1');
      expect(doc2.id).toBe('tx-2');
    });
  });

  describe('Budget factories', () => {
    it('produces valid BudgetInput', () => {
      const input = buildBudgetInput();
      const parsed = budgetInputSchema.parse(input);
      expect(parsed.categoryId).toBe('cat-1');
      expect(parsed.month).toBe('2026-09');
      expect(parsed.limit).toBe(50000);
    });

    it('produces valid Budget document with default matching composite id', () => {
      const doc = buildBudget();
      const parsed = budgetSchema.parse(doc);
      expect(parsed.id).toBe('2026-09_cat-1');
      expect(parsed.categoryId).toBe('cat-1');
      expect(parsed.month).toBe('2026-09');
    });

    it('automatically keeps composite id in sync when categoryId or month is overridden', () => {
      const doc = buildBudget({
        categoryId: 'cat-groceries',
        month: '2026-10',
      });
      const parsed = budgetSchema.parse(doc);
      expect(parsed.id).toBe('2026-10_cat-groceries');
      expect(parsed.categoryId).toBe('cat-groceries');
      expect(parsed.month).toBe('2026-10');
    });

    it('allows explicit id override', () => {
      const doc = buildBudget({
        id: '2026-12_cat-holidays',
        categoryId: 'cat-holidays',
        month: '2026-12',
      });
      const parsed = budgetSchema.parse(doc);
      expect(parsed.id).toBe('2026-12_cat-holidays');
    });
  });

  describe('BalanceTx and AggTx factories', () => {
    it('produces valid BalanceTx', () => {
      const tx = buildBalanceTx();
      expect(tx.type).toBe('expense');
      expect(tx.amount).toBe(2500);
      expect(tx.accountId).toBe('acc-1');

      const custom = buildBalanceTx({ type: 'income', amount: 9000 });
      expect(custom.type).toBe('income');
      expect(custom.amount).toBe(9000);
    });

    it('produces valid AggTx', () => {
      const agg = buildAggTx();
      expect(agg.type).toBe('expense');
      expect(agg.amount).toBe(2500);
      expect(agg.categoryId).toBe('cat-1');
      expect(agg.date).toBe('2026-09-30');

      const custom = buildAggTx({ type: 'income', date: '2026-08-15' });
      expect(custom.type).toBe('income');
      expect(custom.date).toBe('2026-08-15');
    });
  });

  describe('Referential independence', () => {
    it('creates fresh independent date and object instances on each invocation', () => {
      const tx1 = buildTransaction();
      const tx2 = buildTransaction();

      expect(tx1).not.toBe(tx2);
      expect(tx1.createdAt).not.toBe(tx2.createdAt);
      expect(tx1.tags).not.toBe(tx2.tags);
    });
  });
});
