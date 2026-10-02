export {
  CATEGORY_COLOR_KEYS,
  DEFAULT_EXPENSE_CATEGORY_KEYS,
  DEFAULT_INCOME_CATEGORY_KEYS,
  DEFAULT_CATEGORIES,
} from './constants';

export type {
  CategoryColorKey,
  DefaultExpenseCategoryKey,
  DefaultIncomeCategoryKey,
  DefaultCategoryMetadata,
} from './constants';

export {
  categoryColorSchema,
  categoryInputSchema,
  categorySchema,
} from './schemas';

export type { CategoryInput, Category } from './schemas';
