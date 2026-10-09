import { describe, expect, it } from 'vitest';
import type { Budget, EnrichedBudget } from './schemas';
import type { Category } from '@/features/categories';
import type { CategoryTotal } from '@/lib/aggregations';
import {
  buildBudgetId,
  calculateBudgetOverspent,
  calculateBudgetProgress,
  calculateBudgetRemaining,
  calculateBudgetStatus,
  calculateOverallBudgetSummary,
  enrichBudgets,
  getUnbudgetedCategories,
} from './utils';

describe('budgets utils', () => {
  describe('buildBudgetId', () => {
    it('creates deterministic ID in format `${month}_${categoryId}`', () => {
      expect(buildBudgetId('2026-10', 'food_123')).toBe('2026-10_food_123');
      expect(buildBudgetId('2026-01', 'cat-transport')).toBe(
        '2026-01_cat-transport',
      );
    });
  });

  describe('calculateBudgetStatus', () => {
    it('returns "normal" when spent is strictly less than 80% of limit', () => {
      expect(calculateBudgetStatus(0, 10000)).toBe('normal');
      expect(calculateBudgetStatus(5000, 10000)).toBe('normal');
      expect(calculateBudgetStatus(7999, 10000)).toBe('normal');
    });

    it('returns "warning" when spent is between 80% and 100% of limit inclusive', () => {
      expect(calculateBudgetStatus(8000, 10000)).toBe('warning');
      expect(calculateBudgetStatus(8500, 10000)).toBe('warning');
      expect(calculateBudgetStatus(9999, 10000)).toBe('warning');
      expect(calculateBudgetStatus(10000, 10000)).toBe('warning');
    });

    it('returns "exceeded" when spent is strictly greater than limit', () => {
      expect(calculateBudgetStatus(10001, 10000)).toBe('exceeded');
      expect(calculateBudgetStatus(12000, 10000)).toBe('exceeded');
      expect(calculateBudgetStatus(25000, 10000)).toBe('exceeded');
    });

    it('handles defensive boundary conditions when limit <= 0', () => {
      expect(calculateBudgetStatus(0, 0)).toBe('normal');
      expect(calculateBudgetStatus(500, 0)).toBe('exceeded');
      expect(calculateBudgetStatus(0, -100)).toBe('normal');
      expect(calculateBudgetStatus(500, -100)).toBe('exceeded');
    });
  });

  describe('calculateBudgetProgress', () => {
    it('returns 0 when spent is 0 or negative', () => {
      expect(calculateBudgetProgress(0, 10000)).toBe(0);
      expect(calculateBudgetProgress(-500, 10000)).toBe(0);
    });

    it('returns 0 when limit is 0 or negative', () => {
      expect(calculateBudgetProgress(5000, 0)).toBe(0);
      expect(calculateBudgetProgress(5000, -100)).toBe(0);
    });

    it('calculates rounded percentage for normal, warning and exceeded cases', () => {
      expect(calculateBudgetProgress(12000, 30000)).toBe(40);
      expect(calculateBudgetProgress(8500, 10000)).toBe(85);
      expect(calculateBudgetProgress(10000, 10000)).toBe(100);
      expect(calculateBudgetProgress(6200, 5000)).toBe(124);
      expect(calculateBudgetProgress(15000, 10000)).toBe(150);
      expect(calculateBudgetProgress(25000, 10000)).toBe(250);
    });
  });

  describe('calculateBudgetRemaining', () => {
    it('calculates remaining amount when spent <= limit', () => {
      expect(calculateBudgetRemaining(0, 10000)).toBe(10000);
      expect(calculateBudgetRemaining(12000, 30000)).toBe(18000);
      expect(calculateBudgetRemaining(8500, 10000)).toBe(1500);
      expect(calculateBudgetRemaining(10000, 10000)).toBe(0);
    });

    it('returns 0 when spent exceeds limit', () => {
      expect(calculateBudgetRemaining(10001, 10000)).toBe(0);
      expect(calculateBudgetRemaining(25000, 10000)).toBe(0);
    });

    it('handles negative spent and invalid limit defensively', () => {
      expect(calculateBudgetRemaining(-500, 10000)).toBe(10000);
      expect(calculateBudgetRemaining(5000, 0)).toBe(0);
      expect(calculateBudgetRemaining(5000, -100)).toBe(0);
    });
  });

  describe('calculateBudgetOverspent', () => {
    it('returns 0 when spent is less than or equal to limit', () => {
      expect(calculateBudgetOverspent(0, 10000)).toBe(0);
      expect(calculateBudgetOverspent(8500, 10000)).toBe(0);
      expect(calculateBudgetOverspent(10000, 10000)).toBe(0);
    });

    it('calculates overspent amount when spent exceeds limit', () => {
      expect(calculateBudgetOverspent(11200, 10000)).toBe(1200);
      expect(calculateBudgetOverspent(6200, 5000)).toBe(1200);
      expect(calculateBudgetOverspent(25000, 10000)).toBe(15000);
    });

    it('handles edge cases when limit is 0', () => {
      expect(calculateBudgetOverspent(1000, 0)).toBe(1000);
      expect(calculateBudgetOverspent(0, 0)).toBe(0);
    });
  });

  describe('enrichBudgets', () => {
    const now = new Date('2026-10-01T00:00:00.000Z');

    it('returns empty array when budgets list is empty', () => {
      expect(enrichBudgets([], [{ categoryId: 'cat-1', total: 5000 }])).toEqual(
        [],
      );
    });

    it('enriches raw budgets with actual spending data', () => {
      const budgets: Budget[] = [
        {
          id: '2026-10_cat-groceries',
          categoryId: 'cat-groceries',
          month: '2026-10',
          limit: 30000,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: '2026-10_cat-cafe',
          categoryId: 'cat-cafe',
          month: '2026-10',
          limit: 10000,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: '2026-10_cat-fun',
          categoryId: 'cat-fun',
          month: '2026-10',
          limit: 5000,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: '2026-10_cat-books',
          categoryId: 'cat-books',
          month: '2026-10',
          limit: 4000,
          createdAt: now,
          updatedAt: now,
        },
      ];

      const categoryExpenses: CategoryTotal[] = [
        { categoryId: 'cat-groceries', total: 12000 }, // 40% -> normal
        { categoryId: 'cat-cafe', total: 8500 }, // 85% -> warning
        { categoryId: 'cat-fun', total: 6200 }, // 124% -> exceeded
        // cat-books has 0 expenses (not present in expenses array)
      ];

      const result = enrichBudgets(budgets, categoryExpenses);

      expect(result).toHaveLength(4);

      // Groceries: 12000 of 30000 -> 40%, remaining 18000, overspent 0, normal
      expect(result[0]).toEqual({
        id: '2026-10_cat-groceries',
        categoryId: 'cat-groceries',
        month: '2026-10',
        limit: 30000,
        spent: 12000,
        remaining: 18000,
        overspent: 0,
        progress: 40,
        status: 'normal',
        createdAt: now,
        updatedAt: now,
      });

      // Cafe: 8500 of 10000 -> 85%, remaining 1500, overspent 0, warning
      expect(result[1]).toEqual({
        id: '2026-10_cat-cafe',
        categoryId: 'cat-cafe',
        month: '2026-10',
        limit: 10000,
        spent: 8500,
        remaining: 1500,
        overspent: 0,
        progress: 85,
        status: 'warning',
        createdAt: now,
        updatedAt: now,
      });

      // Fun: 6200 of 5000 -> 124%, remaining 0, overspent 1200, exceeded
      expect(result[2]).toEqual({
        id: '2026-10_cat-fun',
        categoryId: 'cat-fun',
        month: '2026-10',
        limit: 5000,
        spent: 6200,
        remaining: 0,
        overspent: 1200,
        progress: 124,
        status: 'exceeded',
        createdAt: now,
        updatedAt: now,
      });

      // Books: 0 of 4000 -> 0%, remaining 4000, overspent 0, normal
      expect(result[3]).toEqual({
        id: '2026-10_cat-books',
        categoryId: 'cat-books',
        month: '2026-10',
        limit: 4000,
        spent: 0,
        remaining: 4000,
        overspent: 0,
        progress: 0,
        status: 'normal',
        createdAt: now,
        updatedAt: now,
      });
    });
  });

  describe('calculateOverallBudgetSummary', () => {
    it('returns zero totals when enriched budgets array is empty', () => {
      const summary = calculateOverallBudgetSummary([]);
      expect(summary).toEqual({
        totalLimit: 0,
        totalSpent: 0,
        totalRemaining: 0,
        totalOverspent: 0,
        overallProgress: 0,
        overallStatus: 'normal',
        budgetCount: 0,
        normalCount: 0,
        warningCount: 0,
        exceededCount: 0,
      });
    });

    it('calculates aggregate summary across normal, warning and exceeded budgets', () => {
      const now = new Date('2026-10-01T00:00:00.000Z');
      const enriched: EnrichedBudget[] = [
        {
          id: '2026-10_cat-1',
          categoryId: 'cat-1',
          month: '2026-10',
          limit: 30000,
          spent: 12000,
          remaining: 18000,
          overspent: 0,
          progress: 40,
          status: 'normal',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: '2026-10_cat-2',
          categoryId: 'cat-2',
          month: '2026-10',
          limit: 10000,
          spent: 8500,
          remaining: 1500,
          overspent: 0,
          progress: 85,
          status: 'warning',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: '2026-10_cat-3',
          categoryId: 'cat-3',
          month: '2026-10',
          limit: 5000,
          spent: 6200,
          remaining: 0,
          overspent: 1200,
          progress: 124,
          status: 'exceeded',
          createdAt: now,
          updatedAt: now,
        },
      ];

      const summary = calculateOverallBudgetSummary(enriched);

      // Total Limit: 30000 + 10000 + 5000 = 45000
      // Total Spent: 12000 + 8500 + 6200 = 26700
      // Remaining: 45000 - 26700 = 18300
      // Overspent: 0
      // Progress: round(26700 / 45000 * 100) = 59%
      // Overall Status: 26700 < 0.8 * 45000 (36000) -> normal
      expect(summary).toEqual({
        totalLimit: 45000,
        totalSpent: 26700,
        totalRemaining: 18300,
        totalOverspent: 0,
        overallProgress: 59,
        overallStatus: 'normal',
        budgetCount: 3,
        normalCount: 1,
        warningCount: 1,
        exceededCount: 1,
      });
    });

    it('correctly calculates overall overspent when total spent exceeds total limit', () => {
      const now = new Date('2026-10-01T00:00:00.000Z');
      const enriched: EnrichedBudget[] = [
        {
          id: '2026-10_cat-1',
          categoryId: 'cat-1',
          month: '2026-10',
          limit: 10000,
          spent: 15000,
          remaining: 0,
          overspent: 5000,
          progress: 150,
          status: 'exceeded',
          createdAt: now,
          updatedAt: now,
        },
      ];

      const summary = calculateOverallBudgetSummary(enriched);
      expect(summary).toEqual({
        totalLimit: 10000,
        totalSpent: 15000,
        totalRemaining: 0,
        totalOverspent: 5000,
        overallProgress: 150,
        overallStatus: 'exceeded',
        budgetCount: 1,
        normalCount: 0,
        warningCount: 0,
        exceededCount: 1,
      });
    });
  });

  describe('getUnbudgetedCategories', () => {
    const now = new Date('2026-10-01T00:00:00.000Z');

    const categories: Category[] = [
      {
        id: 'cat-groceries',
        type: 'expense',
        name: 'Groceries',
        icon: 'shopping-cart',
        color: 'sky',
        archived: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cat-cafe',
        type: 'expense',
        name: 'Cafe',
        icon: 'coffee',
        color: 'amber',
        archived: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cat-salary',
        type: 'income',
        name: 'Salary',
        icon: 'wallet',
        color: 'emerald',
        archived: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cat-old-expense',
        type: 'expense',
        name: 'Old Gym',
        icon: 'dumbbell',
        color: 'red',
        archived: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cat-transport',
        type: 'expense',
        name: 'Transport',
        icon: 'bus',
        color: 'indigo',
        archived: false,
        createdAt: now,
        updatedAt: now,
      },
    ];

    it('filters out income categories, archived categories and categories that already have a budget', () => {
      const budgets: Budget[] = [
        {
          id: '2026-10_cat-groceries',
          categoryId: 'cat-groceries',
          month: '2026-10',
          limit: 30000,
          createdAt: now,
          updatedAt: now,
        },
      ];

      const unbudgeted = getUnbudgetedCategories(categories, budgets);

      // Should contain cat-cafe and cat-transport only
      expect(unbudgeted.map((c) => c.id)).toEqual([
        'cat-cafe',
        'cat-transport',
      ]);
    });

    it('returns empty array when categories is empty', () => {
      expect(getUnbudgetedCategories([], [])).toEqual([]);
    });

    it('returns all active expense categories when budgets is empty', () => {
      const unbudgeted = getUnbudgetedCategories(categories, []);
      expect(unbudgeted.map((c) => c.id)).toEqual([
        'cat-groceries',
        'cat-cafe',
        'cat-transport',
      ]);
    });
  });
});
