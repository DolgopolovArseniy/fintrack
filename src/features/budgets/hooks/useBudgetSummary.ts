import * as React from 'react';
import { useCategories, type Category } from '@/features/categories';
import { useTransactions } from '@/features/transactions';
import { totalsByCategory } from '@/lib/aggregations';
import { addMonths, isValidYearMonth } from '@/lib/dates';
import type { AppError } from '@/lib/errors';
import type { BudgetSummaryTotals, EnrichedBudget } from '../schemas';
import {
  calculateOverallBudgetSummary,
  enrichBudgets,
  getUnbudgetedCategories,
} from '../utils';
import { useBudgets } from './useBudgets';

export interface UseBudgetSummaryResult {
  enrichedBudgets: EnrichedBudget[];
  summaryTotals: BudgetSummaryTotals;
  unbudgetedCategories: Category[];
  previousMonthBudgetsCount: number;
  isLoading: boolean;
  error: AppError | null;
}

/**
 * Combines real-time subscriptions for budgets, transactions, and categories for a given month,
 * returning enriched budgets with actual spending, aggregate KPIs, and unbudgeted categories.
 */
export function useBudgetSummary(month: string): UseBudgetSummaryResult {
  const prevMonth = React.useMemo(
    () => (isValidYearMonth(month) ? addMonths(month, -1) : ''),
    [month],
  );

  const budgetsSub = useBudgets(month);
  const prevBudgetsSub = useBudgets(prevMonth);
  const categoriesSub = useCategories();
  const transactionsSub = useTransactions(isValidYearMonth(month) ? month : '');

  const isLoading =
    budgetsSub.status === 'loading' ||
    categoriesSub.status === 'loading' ||
    transactionsSub.status === 'loading' ||
    prevBudgetsSub.status === 'loading';

  const error =
    budgetsSub.status === 'error'
      ? budgetsSub.error
      : categoriesSub.status === 'error'
        ? categoriesSub.error
        : transactionsSub.status === 'error'
          ? transactionsSub.error
          : prevBudgetsSub.status === 'error'
            ? prevBudgetsSub.error
            : null;

  const computed = React.useMemo(() => {
    const budgets = budgetsSub.status === 'success' ? budgetsSub.data : [];
    const categories =
      categoriesSub.status === 'success' ? categoriesSub.data : [];
    const transactions =
      transactionsSub.status === 'success' ? transactionsSub.data : [];
    const prevBudgets =
      prevBudgetsSub.status === 'success' ? prevBudgetsSub.data : [];

    const expenseTotals = totalsByCategory(transactions, 'expense');
    const enrichedBudgets = enrichBudgets(budgets, expenseTotals);
    const summaryTotals = calculateOverallBudgetSummary(enrichedBudgets);
    const unbudgetedCategories = getUnbudgetedCategories(categories, budgets);
    const previousMonthBudgetsCount = prevBudgets.length;

    return {
      enrichedBudgets,
      summaryTotals,
      unbudgetedCategories,
      previousMonthBudgetsCount,
    };
  }, [budgetsSub, categoriesSub, transactionsSub, prevBudgetsSub]);

  return {
    ...computed,
    isLoading,
    error,
  };
}
