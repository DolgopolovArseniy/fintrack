import type {
  Budget,
  BudgetStatus,
  BudgetSummaryTotals,
  EnrichedBudget,
} from './schemas';
import type { Category } from '@/features/categories';
import type { CategoryTotal } from '@/lib/aggregations';

/**
 * Constructs a deterministic budget document ID from month and category ID.
 * Pattern: `${month}_${categoryId}`.
 */
export function buildBudgetId(month: string, categoryId: string): string {
  return `${month}_${categoryId}`;
}

/**
 * Calculates budget status based on spent amount vs limit:
 * - 'normal': spent < 80% of limit
 * - 'warning': 80% <= spent <= 100% of limit
 * - 'exceeded': spent > limit
 */
export function calculateBudgetStatus(
  spent: number,
  limit: number,
): BudgetStatus {
  if (limit <= 0) {
    return spent > 0 ? 'exceeded' : 'normal';
  }
  if (spent > limit) {
    return 'exceeded';
  }
  if (spent >= limit * 0.8) {
    return 'warning';
  }
  return 'normal';
}

/**
 * Calculates budget exhaustion percentage (can be >= 100).
 * Returns integer percentage rounded to nearest whole number.
 * Returns 0 if limit <= 0 or spent <= 0.
 */
export function calculateBudgetProgress(spent: number, limit: number): number {
  if (limit <= 0 || spent <= 0) {
    return 0;
  }
  return Math.round((spent / limit) * 100);
}

/**
 * Calculates remaining available budget amount (>= 0).
 */
export function calculateBudgetRemaining(spent: number, limit: number): number {
  if (limit <= 0) {
    return 0;
  }
  return Math.max(0, limit - Math.max(0, spent));
}

/**
 * Calculates amount over budget limit (>= 0).
 */
export function calculateBudgetOverspent(spent: number, limit: number): number {
  if (spent <= limit) {
    return 0;
  }
  return Math.max(0, spent - Math.max(0, limit));
}

/**
 * Enriches raw budget documents with actual category expenses from transactions.
 */
export function enrichBudgets(
  budgets: readonly Budget[],
  categoryExpenses: readonly CategoryTotal[],
): EnrichedBudget[] {
  const expenseMap = new Map<string, number>();
  for (const item of categoryExpenses) {
    expenseMap.set(item.categoryId, item.total);
  }

  return budgets.map((budget) => {
    const spent = expenseMap.get(budget.categoryId) ?? 0;
    const limit = budget.limit;
    const remaining = calculateBudgetRemaining(spent, limit);
    const overspent = calculateBudgetOverspent(spent, limit);
    const progress = calculateBudgetProgress(spent, limit);
    const status = calculateBudgetStatus(spent, limit);

    return {
      id: budget.id,
      categoryId: budget.categoryId,
      month: budget.month,
      limit,
      spent,
      remaining,
      overspent,
      progress,
      status,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
    };
  });
}

/**
 * Calculates aggregated KPI summary across all enriched budgets of a month.
 */
export function calculateOverallBudgetSummary(
  enrichedBudgets: readonly EnrichedBudget[],
): BudgetSummaryTotals {
  let totalLimit = 0;
  let totalSpent = 0;
  let normalCount = 0;
  let warningCount = 0;
  let exceededCount = 0;

  for (const budget of enrichedBudgets) {
    totalLimit += budget.limit;
    totalSpent += budget.spent;

    switch (budget.status) {
      case 'normal':
        normalCount += 1;
        break;
      case 'warning':
        warningCount += 1;
        break;
      case 'exceeded':
        exceededCount += 1;
        break;
    }
  }

  const totalRemaining = calculateBudgetRemaining(totalSpent, totalLimit);
  const totalOverspent = calculateBudgetOverspent(totalSpent, totalLimit);
  const overallProgress = calculateBudgetProgress(totalSpent, totalLimit);
  const overallStatus = calculateBudgetStatus(totalSpent, totalLimit);

  return {
    totalLimit,
    totalSpent,
    totalRemaining,
    totalOverspent,
    overallProgress,
    overallStatus,
    budgetCount: enrichedBudgets.length,
    normalCount,
    warningCount,
    exceededCount,
  };
}

/**
 * Returns active expense categories that do not have a budget defined for the month.
 */
export function getUnbudgetedCategories(
  categories: readonly Category[],
  budgets: readonly Budget[],
): Category[] {
  const budgetedCategoryIds = new Set(budgets.map((b) => b.categoryId));
  return categories.filter(
    (cat) =>
      cat.type === 'expense' &&
      !cat.archived &&
      !budgetedCategoryIds.has(cat.id),
  );
}
