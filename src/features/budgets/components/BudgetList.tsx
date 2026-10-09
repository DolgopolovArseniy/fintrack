import * as React from 'react';
import type { Category } from '@/features/categories';
import { cn } from '@/lib/cn';
import type { BudgetStatus, EnrichedBudget } from '../schemas';
import { BudgetCard } from './BudgetCard';

export interface BudgetListProps {
  budgets: EnrichedBudget[];
  categories: Category[];
  onEdit?: (budget: EnrichedBudget) => void;
  onDelete?: (budget: EnrichedBudget) => void;
  onViewTransactions?: (budget: EnrichedBudget) => void;
  className?: string;
}

const STATUS_PRIORITY: Record<BudgetStatus, number> = {
  exceeded: 0,
  warning: 1,
  normal: 2,
};

/**
 * Grid list of budget cards with deterministic sorting:
 * 1. Exceeded budgets first, followed by Warning, then Normal.
 * 2. Higher progress percentages first.
 * 3. Alphabetical tie-breaker by category name.
 */
export function BudgetList({
  budgets,
  categories,
  onEdit,
  onDelete,
  onViewTransactions,
  className,
}: BudgetListProps) {
  const categoriesMap = React.useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  const sortedBudgets = React.useMemo(() => {
    return [...budgets].sort((a, b) => {
      const statusDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
      if (statusDiff !== 0) {
        return statusDiff;
      }

      if (b.progress !== a.progress) {
        return b.progress - a.progress;
      }

      const catA = categoriesMap.get(a.categoryId);
      const catB = categoriesMap.get(b.categoryId);
      const nameA = catA?.name || catA?.systemKey || a.categoryId;
      const nameB = catB?.name || catB?.systemKey || b.categoryId;
      return nameA.localeCompare(nameB);
    });
  }, [budgets, categoriesMap]);

  if (sortedBudgets.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="budget-list"
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {sortedBudgets.map((budget) => (
        <BudgetCard
          key={budget.id}
          budget={budget}
          category={categoriesMap.get(budget.categoryId)}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewTransactions={onViewTransactions}
        />
      ))}
    </div>
  );
}
