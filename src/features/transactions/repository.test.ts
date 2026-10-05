import { describe, expect, it, vi } from 'vitest';
import {
  createTransaction,
  subscribeTransactionsByDateRange,
  subscribeTransactionsByMonth,
  updateTransaction,
} from './repository';
import type { Transaction } from './schemas';

describe('transactions repository unit tests', () => {
  const uid = 'test-user';

  describe('input validations', () => {
    it('rejects createTransaction when amount is <= 0 or not an integer', async () => {
      await expect(
        createTransaction(uid, {
          type: 'expense',
          amount: 0,
          accountId: 'acc-1',
          categoryId: 'cat-1',
          date: '2026-05-15',
        }),
      ).rejects.toThrow();

      await expect(
        createTransaction(uid, {
          type: 'expense',
          amount: -100,
          accountId: 'acc-1',
          categoryId: 'cat-1',
          date: '2026-05-15',
        }),
      ).rejects.toThrow();
    });

    it('rejects createTransaction with invalid date format', async () => {
      await expect(
        createTransaction(uid, {
          type: 'expense',
          amount: 1000,
          accountId: 'acc-1',
          categoryId: 'cat-1',
          date: 'not-a-date',
        }),
      ).rejects.toThrow();
    });

    it('rejects updateTransaction with invalid updated date or amount', async () => {
      const currentTx: Transaction = {
        id: 'tx-1',
        type: 'expense',
        amount: 1000,
        accountId: 'acc-1',
        categoryId: 'cat-1',
        date: '2026-05-15',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await expect(
        updateTransaction(uid, 'tx-1', currentTx, {
          amount: -500,
        }),
      ).rejects.toThrow();

      await expect(
        updateTransaction(uid, 'tx-1', currentTx, {
          date: '2026-13-45',
        }),
      ).rejects.toThrow();
    });

    it('calls onError in subscribeTransactionsByMonth when month format is invalid', () => {
      const onData = vi.fn();
      const onError = vi.fn();

      const unsubscribe = subscribeTransactionsByMonth(
        uid,
        'invalid-month',
        onData,
        onError,
      );

      expect(onError).toHaveBeenCalledTimes(1);
      const reportedError = onError.mock.calls[0]?.[0] as
        { message?: string } | undefined;
      expect(reportedError?.message).toContain('Invalid month');
      expect(typeof unsubscribe).toBe('function');
    });

    it('calls onError in subscribeTransactionsByDateRange when startDate format is invalid', () => {
      const onData = vi.fn();
      const onError = vi.fn();

      const unsubscribe = subscribeTransactionsByDateRange(
        uid,
        'invalid-date',
        '2026-05-31',
        onData,
        onError,
      );

      expect(onError).toHaveBeenCalledTimes(1);
      const reportedError = onError.mock.calls[0]?.[0] as
        { message?: string } | undefined;
      expect(reportedError?.message).toContain('Invalid startDate');
      expect(typeof unsubscribe).toBe('function');
    });

    it('calls onError in subscribeTransactionsByDateRange when endDate format is invalid', () => {
      const onData = vi.fn();
      const onError = vi.fn();

      const unsubscribe = subscribeTransactionsByDateRange(
        uid,
        '2026-05-01',
        'invalid-date',
        onData,
        onError,
      );

      expect(onError).toHaveBeenCalledTimes(1);
      const reportedError = onError.mock.calls[0]?.[0] as
        { message?: string } | undefined;
      expect(reportedError?.message).toContain('Invalid endDate');
      expect(typeof unsubscribe).toBe('function');
    });

    it('calls onError in subscribeTransactionsByDateRange when startDate > endDate', () => {
      const onData = vi.fn();
      const onError = vi.fn();

      const unsubscribe = subscribeTransactionsByDateRange(
        uid,
        '2026-06-01',
        '2026-05-01',
        onData,
        onError,
      );

      expect(onError).toHaveBeenCalledTimes(1);
      const reportedError = onError.mock.calls[0]?.[0] as
        { message?: string } | undefined;
      expect(reportedError?.message).toContain('Invalid date range');
      expect(typeof unsubscribe).toBe('function');
    });
  });
});
