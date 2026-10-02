export const CATEGORY_COLOR_KEYS = [
  'slate',
  'red',
  'orange',
  'amber',
  'lime',
  'emerald',
  'teal',
  'sky',
  'indigo',
  'violet',
  'pink',
  'stone',
] as const;

export type CategoryColorKey = (typeof CATEGORY_COLOR_KEYS)[number];

export const DEFAULT_EXPENSE_CATEGORY_KEYS = [
  'food',
  'transport',
  'housing',
  'utilities',
  'health',
  'entertainment',
  'shopping',
  'other_expense',
] as const;

export type DefaultExpenseCategoryKey =
  (typeof DEFAULT_EXPENSE_CATEGORY_KEYS)[number];

export const DEFAULT_INCOME_CATEGORY_KEYS = [
  'salary',
  'gift',
  'other_income',
] as const;

export type DefaultIncomeCategoryKey =
  (typeof DEFAULT_INCOME_CATEGORY_KEYS)[number];

export interface DefaultCategoryMetadata {
  systemKey: DefaultExpenseCategoryKey | DefaultIncomeCategoryKey;
  type: 'expense' | 'income';
  icon: string;
  color: CategoryColorKey;
}

export const DEFAULT_CATEGORIES: readonly DefaultCategoryMetadata[] = [
  { systemKey: 'food', type: 'expense', icon: 'utensils', color: 'orange' },
  { systemKey: 'transport', type: 'expense', icon: 'car', color: 'sky' },
  { systemKey: 'housing', type: 'expense', icon: 'home', color: 'indigo' },
  { systemKey: 'utilities', type: 'expense', icon: 'zap', color: 'amber' },
  { systemKey: 'health', type: 'expense', icon: 'heart-pulse', color: 'red' },
  { systemKey: 'entertainment', type: 'expense', icon: 'film', color: 'pink' },
  {
    systemKey: 'shopping',
    type: 'expense',
    icon: 'shopping-bag',
    color: 'emerald',
  },
  {
    systemKey: 'other_expense',
    type: 'expense',
    icon: 'circle-ellipsis',
    color: 'slate',
  },
  { systemKey: 'salary', type: 'income', icon: 'wallet', color: 'emerald' },
  { systemKey: 'gift', type: 'income', icon: 'gift', color: 'teal' },
  {
    systemKey: 'other_income',
    type: 'income',
    icon: 'arrow-down-left',
    color: 'lime',
  },
] as const;
