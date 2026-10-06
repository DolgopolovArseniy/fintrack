import { describe, expect, it } from 'vitest';
import { buildAccount, buildTransaction } from '@/test/factories';
import { calculatePercentageChange, computeDashboardMetrics } from './utils';

describe('dashboard utils', () => {
  describe('calculatePercentageChange', () => {
    it('calculates increase percentage correctly', () => {
      const result = calculatePercentageChange(1500, 1000);
      expect(result).toEqual({
        percent: 50,
        direction: 'increase',
        isNewPeriod: false,
      });
    });

    it('calculates decrease percentage correctly', () => {
      const result = calculatePercentageChange(800, 1000);
      expect(result).toEqual({
        percent: 20,
        direction: 'decrease',
        isNewPeriod: false,
      });
    });

    it('returns 0% neutral when both values are equal and positive', () => {
      const result = calculatePercentageChange(2500, 2500);
      expect(result).toEqual({
        percent: 0,
        direction: 'neutral',
        isNewPeriod: false,
      });
    });

    it('returns 0% neutral when both values are 0', () => {
      const result = calculatePercentageChange(0, 0);
      expect(result).toEqual({
        percent: 0,
        direction: 'neutral',
        isNewPeriod: false,
      });
    });

    it('returns +100% and isNewPeriod: true when previous is 0 and current is positive', () => {
      const result = calculatePercentageChange(3500, 0);
      expect(result).toEqual({
        percent: 100,
        direction: 'increase',
        isNewPeriod: true,
      });
    });

    it('returns -100% and isNewPeriod: false when current drops to 0 from a positive previous value', () => {
      const result = calculatePercentageChange(0, 3500);
      expect(result).toEqual({
        percent: 100,
        direction: 'decrease',
        isNewPeriod: false,
      });
    });

    it('rounds percentage values using standard Math.round', () => {
      // 100 / 300 = 33.333% -> 33
      expect(calculatePercentageChange(400, 300)).toEqual({
        percent: 33,
        direction: 'increase',
        isNewPeriod: false,
      });

      // 200 / 300 = 66.666% -> 67
      expect(calculatePercentageChange(500, 300)).toEqual({
        percent: 67,
        direction: 'increase',
        isNewPeriod: false,
      });
    });

    it('treats changes that round to 0% as neutral', () => {
      // +1 on 10000 = 0.01% -> rounds to 0
      const result = calculatePercentageChange(10001, 10000);
      expect(result).toEqual({
        percent: 0,
        direction: 'neutral',
        isNewPeriod: false,
      });
    });

    it('handles non-finite values safely', () => {
      expect(calculatePercentageChange(NaN, 100)).toEqual({
        percent: 0,
        direction: 'neutral',
        isNewPeriod: false,
      });
      expect(calculatePercentageChange(100, Infinity)).toEqual({
        percent: 0,
        direction: 'neutral',
        isNewPeriod: false,
      });
    });

    it('handles negative values safely', () => {
      // From 0 to -500
      expect(calculatePercentageChange(-500, 0)).toEqual({
        percent: 100,
        direction: 'decrease',
        isNewPeriod: false,
      });

      // From -100 to -50 (increased by 50 towards 0)
      expect(calculatePercentageChange(-50, -100)).toEqual({
        percent: 50,
        direction: 'increase',
        isNewPeriod: false,
      });
    });
  });

  describe('computeDashboardMetrics', () => {
    it('computes total balance by summing only non-archived accounts', () => {
      const accounts = [
        buildAccount({ id: 'acc-1', balance: 50000, archived: false }),
        buildAccount({ id: 'acc-2', balance: 30000, archived: false }),
        buildAccount({ id: 'acc-3', balance: 20000, archived: true }), // ignored
      ];

      const metrics = computeDashboardMetrics({
        accounts,
        selectedMonthTxs: [],
        previousMonthTxs: [],
      });

      expect(metrics.totalBalance).toBe(80000);
    });

    it('handles empty accounts list with 0 total balance', () => {
      const metrics = computeDashboardMetrics({
        accounts: [],
        selectedMonthTxs: [],
        previousMonthTxs: [],
      });

      expect(metrics.totalBalance).toBe(0);
    });

    it('computes income, expense, and net savings for the selected month', () => {
      const selectedMonthTxs = [
        buildTransaction({
          type: 'income',
          amount: 80000,
          date: '2026-05-10',
        }),
        buildTransaction({
          type: 'expense',
          amount: 30000,
          date: '2026-05-15',
        }),
        buildTransaction({
          type: 'expense',
          amount: 10000,
          date: '2026-05-20',
        }),
      ];

      const metrics = computeDashboardMetrics({
        accounts: [],
        selectedMonthTxs,
        previousMonthTxs: [],
      });

      expect(metrics.currentIncome).toBe(80000);
      expect(metrics.currentExpense).toBe(40000);
      expect(metrics.netSavings).toBe(40000);
      // savingsRate = (40000 / 80000) * 100 = 50%
      expect(metrics.savingsRate).toBe(50);
    });

    it('calculates negative savings rate when expenses exceed income', () => {
      const selectedMonthTxs = [
        buildTransaction({
          type: 'income',
          amount: 50000,
          date: '2026-05-10',
        }),
        buildTransaction({
          type: 'expense',
          amount: 75000,
          date: '2026-05-15',
        }),
      ];

      const metrics = computeDashboardMetrics({
        accounts: [],
        selectedMonthTxs,
        previousMonthTxs: [],
      });

      expect(metrics.netSavings).toBe(-25000);
      // (-25000 / 50000) * 100 = -50%
      expect(metrics.savingsRate).toBe(-50);
    });

    it('sets savingsRate to null when income is zero or negative', () => {
      const selectedMonthTxs = [
        buildTransaction({
          type: 'expense',
          amount: 20000,
          date: '2026-05-15',
        }),
      ];

      const metrics = computeDashboardMetrics({
        accounts: [],
        selectedMonthTxs,
        previousMonthTxs: [],
      });

      expect(metrics.currentIncome).toBe(0);
      expect(metrics.savingsRate).toBeNull();
    });

    it('computes savingsRate of 0 without -0 when net savings is exactly 0', () => {
      const selectedMonthTxs = [
        buildTransaction({
          type: 'income',
          amount: 30000,
          date: '2026-05-10',
        }),
        buildTransaction({
          type: 'expense',
          amount: 30000,
          date: '2026-05-15',
        }),
      ];

      const metrics = computeDashboardMetrics({
        accounts: [],
        selectedMonthTxs,
        previousMonthTxs: [],
      });

      expect(metrics.savingsRate).toBe(0);
      expect(Object.is(metrics.savingsRate, -0)).toBe(false);
    });

    it('computes incomeChange and expenseChange compared to previous month transactions', () => {
      const selectedMonthTxs = [
        buildTransaction({
          type: 'income',
          amount: 120000,
          date: '2026-05-10',
        }),
        buildTransaction({
          type: 'expense',
          amount: 40000,
          date: '2026-05-15',
        }),
      ];

      const previousMonthTxs = [
        buildTransaction({
          type: 'income',
          amount: 100000,
          date: '2026-04-10',
        }),
        buildTransaction({
          type: 'expense',
          amount: 50000,
          date: '2026-04-15',
        }),
      ];

      const metrics = computeDashboardMetrics({
        accounts: [],
        selectedMonthTxs,
        previousMonthTxs,
      });

      // Income: 100000 -> 120000 (+20%)
      expect(metrics.incomeChange).toEqual({
        percent: 20,
        direction: 'increase',
        isNewPeriod: false,
      });

      // Expense: 50000 -> 40000 (-20%)
      expect(metrics.expenseChange).toEqual({
        percent: 20,
        direction: 'decrease',
        isNewPeriod: false,
      });
    });

    it('correctly flags isNewPeriod when previous month had no income/expenses', () => {
      const selectedMonthTxs = [
        buildTransaction({
          type: 'income',
          amount: 100000,
          date: '2026-05-10',
        }),
        buildTransaction({
          type: 'expense',
          amount: 50000,
          date: '2026-05-15',
        }),
      ];

      const metrics = computeDashboardMetrics({
        accounts: [],
        selectedMonthTxs,
        previousMonthTxs: [], // empty previous month
      });

      expect(metrics.incomeChange).toEqual({
        percent: 100,
        direction: 'increase',
        isNewPeriod: true,
      });

      expect(metrics.expenseChange).toEqual({
        percent: 100,
        direction: 'increase',
        isNewPeriod: true,
      });
    });
  });
});
