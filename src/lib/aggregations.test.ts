import { describe, expect, it } from 'vitest';
import {
  AggTx,
  sumByType,
  topNWithOther,
  totalsByCategory,
  totalsByMonth,
} from './aggregations';

describe('aggregations module (AC6)', () => {
  describe('sumByType', () => {
    it('returns zero totals for an empty array', () => {
      const result = sumByType([]);
      expect(result).toEqual({ income: 0, expense: 0, net: 0 });
    });

    it('aggregates income-only transactions', () => {
      const txs: AggTx[] = [
        {
          type: 'income',
          amount: 5000,
          categoryId: 'cat-salary',
          date: '2026-09-01',
        },
        {
          type: 'income',
          amount: 1500,
          categoryId: 'cat-bonus',
          date: '2026-09-10',
        },
      ];
      const result = sumByType(txs);
      expect(result).toEqual({ income: 6500, expense: 0, net: 6500 });
    });

    it('aggregates expense-only transactions', () => {
      const txs: AggTx[] = [
        {
          type: 'expense',
          amount: 1200,
          categoryId: 'cat-food',
          date: '2026-09-02',
        },
        {
          type: 'expense',
          amount: 800,
          categoryId: 'cat-transport',
          date: '2026-09-03',
        },
      ];
      const result = sumByType(txs);
      expect(result).toEqual({ income: 0, expense: 2000, net: -2000 });
    });

    it('aggregates mixed transactions with positive, negative, and zero net', () => {
      // Positive net
      const posTxs: AggTx[] = [
        {
          type: 'income',
          amount: 5000,
          categoryId: 'cat-salary',
          date: '2026-09-01',
        },
        {
          type: 'expense',
          amount: 2000,
          categoryId: 'cat-rent',
          date: '2026-09-02',
        },
      ];
      expect(sumByType(posTxs)).toEqual({
        income: 5000,
        expense: 2000,
        net: 3000,
      });

      // Negative net
      const negTxs: AggTx[] = [
        {
          type: 'income',
          amount: 1000,
          categoryId: 'cat-gift',
          date: '2026-09-01',
        },
        {
          type: 'expense',
          amount: 3500,
          categoryId: 'cat-repairs',
          date: '2026-09-05',
        },
      ];
      expect(sumByType(negTxs)).toEqual({
        income: 1000,
        expense: 3500,
        net: -2500,
      });

      // Zero net (ensuring no -0)
      const zeroNetTxs: AggTx[] = [
        {
          type: 'income',
          amount: 2000,
          categoryId: 'cat-gift',
          date: '2026-09-01',
        },
        {
          type: 'expense',
          amount: 2000,
          categoryId: 'cat-food',
          date: '2026-09-02',
        },
      ];
      const zeroResult = sumByType(zeroNetTxs);
      expect(zeroResult).toEqual({ income: 2000, expense: 2000, net: 0 });
      expect(Object.is(zeroResult.net, 0)).toBe(true);
    });
  });

  describe('totalsByCategory', () => {
    it('returns empty array for empty transactions or no matching type', () => {
      expect(totalsByCategory([], 'expense')).toEqual([]);

      const incomeOnly: AggTx[] = [
        {
          type: 'income',
          amount: 1000,
          categoryId: 'cat-salary',
          date: '2026-09-01',
        },
      ];
      expect(totalsByCategory(incomeOnly, 'expense')).toEqual([]);
    });

    it('aggregates totals by category and sorts descending by amount', () => {
      const txs: AggTx[] = [
        {
          type: 'expense',
          amount: 500,
          categoryId: 'cat-food',
          date: '2026-09-01',
        },
        {
          type: 'expense',
          amount: 1500,
          categoryId: 'cat-rent',
          date: '2026-09-02',
        },
        {
          type: 'expense',
          amount: 700,
          categoryId: 'cat-food',
          date: '2026-09-03',
        },
        {
          type: 'income',
          amount: 10000,
          categoryId: 'cat-salary',
          date: '2026-09-01',
        }, // Should be ignored
      ];

      const result = totalsByCategory(txs, 'expense');
      expect(result).toEqual([
        { categoryId: 'cat-rent', total: 1500 },
        { categoryId: 'cat-food', total: 1200 },
      ]);
    });

    it('breaks ties deterministically by categoryId ascending', () => {
      const txs: AggTx[] = [
        {
          type: 'expense',
          amount: 1000,
          categoryId: 'cat-b',
          date: '2026-09-01',
        },
        {
          type: 'expense',
          amount: 1000,
          categoryId: 'cat-a',
          date: '2026-09-02',
        },
        {
          type: 'expense',
          amount: 1000,
          categoryId: 'cat-c',
          date: '2026-09-03',
        },
        {
          type: 'expense',
          amount: 2000,
          categoryId: 'cat-top',
          date: '2026-09-04',
        },
      ];

      const result = totalsByCategory(txs, 'expense');
      expect(result).toEqual([
        { categoryId: 'cat-top', total: 2000 },
        { categoryId: 'cat-a', total: 1000 },
        { categoryId: 'cat-b', total: 1000 },
        { categoryId: 'cat-c', total: 1000 },
      ]);
    });
  });

  describe('totalsByMonth', () => {
    it('returns empty array when transactions are empty', () => {
      expect(totalsByMonth([])).toEqual([]);
    });

    it('aggregates income and expenses for single month', () => {
      const txs: AggTx[] = [
        {
          type: 'income',
          amount: 3000,
          categoryId: 'cat-salary',
          date: '2026-09-01',
        },
        {
          type: 'expense',
          amount: 1000,
          categoryId: 'cat-food',
          date: '2026-09-15',
        },
        {
          type: 'expense',
          amount: 500,
          categoryId: 'cat-cafe',
          date: '2026-09-20',
        },
      ];

      const result = totalsByMonth(txs);
      expect(result).toEqual([
        { month: '2026-09', income: 3000, expense: 1500 },
      ]);
    });

    it('sorts months chronologically ascending without gaps for months with data', () => {
      const txs: AggTx[] = [
        {
          type: 'expense',
          amount: 1000,
          categoryId: 'cat-1',
          date: '2026-11-05',
        },
        {
          type: 'income',
          amount: 2000,
          categoryId: 'cat-2',
          date: '2026-09-10',
        },
        {
          type: 'expense',
          amount: 500,
          categoryId: 'cat-3',
          date: '2025-12-31',
        },
      ];

      const result = totalsByMonth(txs);
      expect(result).toEqual([
        { month: '2025-12', income: 0, expense: 500 },
        { month: '2026-09', income: 2000, expense: 0 },
        { month: '2026-11', income: 0, expense: 1000 },
      ]);
    });

    it('fills gaps when fillGaps option is enabled', () => {
      const txs: AggTx[] = [
        {
          type: 'income',
          amount: 1000,
          categoryId: 'cat-1',
          date: '2026-01-10',
        },
        {
          type: 'expense',
          amount: 500,
          categoryId: 'cat-2',
          date: '2026-03-20',
        },
      ];

      const result = totalsByMonth(txs, { fillGaps: true });
      expect(result).toEqual([
        { month: '2026-01', income: 1000, expense: 0 },
        { month: '2026-02', income: 0, expense: 0 },
        { month: '2026-03', income: 0, expense: 500 },
      ]);

      // Single month with fillGaps does not expand
      const singleMonthTxs: AggTx[] = [
        {
          type: 'income',
          amount: 1000,
          categoryId: 'cat-1',
          date: '2026-05-01',
        },
      ];
      expect(totalsByMonth(singleMonthTxs, { fillGaps: true })).toEqual([
        { month: '2026-05', income: 1000, expense: 0 },
      ]);
    });
  });

  describe('topNWithOther', () => {
    it('returns empty array when input is empty', () => {
      const result = topNWithOther([], 5, (total) => ({
        categoryId: 'other',
        total,
      }));
      expect(result).toEqual([]);
    });

    it('returns items unchanged if items count is less than or equal to n (AC6)', () => {
      const items = [
        { categoryId: 'cat-1', total: 5000 },
        { categoryId: 'cat-2', total: 3000 },
      ];

      const resultLess = topNWithOther(items, 5, (total) => ({
        categoryId: 'other',
        total,
      }));
      expect(resultLess).toEqual(items);
      expect(resultLess).not.toBe(items); // Shallow copy

      const resultEqual = topNWithOther(items, 2, (total) => ({
        categoryId: 'other',
        total,
      }));
      expect(resultEqual).toEqual(items);
    });

    it('collapses remaining tail items into otherFactory result when items exceed n (AC6)', () => {
      const items = [
        { categoryId: 'cat-1', total: 5000 },
        { categoryId: 'cat-2', total: 3000 },
        { categoryId: 'cat-3', total: 1500 },
        { categoryId: 'cat-4', total: 500 },
        { categoryId: 'cat-5', total: 200 },
      ];

      const result = topNWithOther(items, 3, (total) => ({
        categoryId: 'other',
        total,
      }));
      expect(result).toEqual([
        { categoryId: 'cat-1', total: 5000 },
        { categoryId: 'cat-2', total: 3000 },
        { categoryId: 'cat-3', total: 1500 },
        { categoryId: 'other', total: 700 }, // 500 + 200
      ]);
    });

    it('handles n <= 0 by collapsing all items or returning empty', () => {
      const emptyResult = topNWithOther([], 0, (total) => ({
        categoryId: 'other',
        total,
      }));
      expect(emptyResult).toEqual([]);

      const items = [
        { categoryId: 'cat-1', total: 1000 },
        { categoryId: 'cat-2', total: 2000 },
      ];
      const collapsed = topNWithOther(items, 0, (total) => ({
        categoryId: 'other',
        total,
      }));
      expect(collapsed).toEqual([{ categoryId: 'other', total: 3000 }]);

      const negativeN = topNWithOther(items, -2, (total) => ({
        categoryId: 'other',
        total,
      }));
      expect(negativeN).toEqual([{ categoryId: 'other', total: 3000 }]);
    });

    it('preserves generic properties in items', () => {
      type CustomItem = {
        name: string;
        color: string;
        total: number;
      };

      const customItems: CustomItem[] = [
        { name: 'Rent', color: 'blue', total: 1000 },
        { name: 'Food', color: 'green', total: 500 },
        { name: 'Fuel', color: 'yellow', total: 200 },
      ];

      const result = topNWithOther(customItems, 2, (total) => ({
        name: 'Other',
        color: 'gray',
        total,
      }));

      expect(result).toEqual([
        { name: 'Rent', color: 'blue', total: 1000 },
        { name: 'Food', color: 'green', total: 500 },
        { name: 'Other', color: 'gray', total: 200 },
      ]);
    });
  });
});
