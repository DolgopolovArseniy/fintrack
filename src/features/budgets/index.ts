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
