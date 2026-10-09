export {
  budgetInputSchema,
  budgetUpdateInputSchema,
  budgetSchema,
} from './schemas';

export type {
  BudgetInput,
  BudgetUpdateInput,
  Budget,
  BudgetStatus,
  EnrichedBudget,
  BudgetSummaryTotals,
} from './schemas';

export { budgetConverter, budgetsCollectionRef } from './converters';

export {
  subscribeBudgetsByMonth,
  createBudget,
  updateBudget,
  deleteBudget,
  copyBudgetsFromMonth,
} from './repository';

export type {
  Unsubscribe,
  CopyBudgetsOptions,
  CopyBudgetsResult,
} from './repository';

export { useBudgets } from './hooks/useBudgets';
export { useBudgetMutations } from './hooks/useBudgetMutations';
export type { UseBudgetMutationsResult } from './hooks/useBudgetMutations';
export { useBudgetSummary } from './hooks/useBudgetSummary';
export type { UseBudgetSummaryResult } from './hooks/useBudgetSummary';

export {
  buildBudgetId,
  calculateBudgetStatus,
  calculateBudgetProgress,
  calculateBudgetRemaining,
  calculateBudgetOverspent,
  enrichBudgets,
  calculateOverallBudgetSummary,
  getUnbudgetedCategories,
} from './utils';

export { BudgetProgressBar } from './components/BudgetProgressBar';
export type { BudgetProgressBarProps } from './components/BudgetProgressBar';

export { BudgetCard } from './components/BudgetCard';
export type { BudgetCardProps } from './components/BudgetCard';

export { BudgetSummaryHeader } from './components/BudgetSummaryHeader';
export type { BudgetSummaryHeaderProps } from './components/BudgetSummaryHeader';

export { UnbudgetedCategoriesSection } from './components/UnbudgetedCategoriesSection';
export type { UnbudgetedCategoriesSectionProps } from './components/UnbudgetedCategoriesSection';

export { BudgetForm } from './components/BudgetForm';
export type { BudgetFormProps } from './components/BudgetForm';

export { CopyBudgetsDialog } from './components/CopyBudgetsDialog';
export type { CopyBudgetsDialogProps } from './components/CopyBudgetsDialog';

export { BudgetList } from './components/BudgetList';
export type { BudgetListProps } from './components/BudgetList';
