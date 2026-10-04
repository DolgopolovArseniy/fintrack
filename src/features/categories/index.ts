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

export { categoryConverter, categoriesCollectionRef } from './converters';

export {
  subscribeCategories,
  createCategory,
  updateCategory,
  archiveCategory,
  unarchiveCategory,
} from './repository';

export type { CategoryUpdateInput, Unsubscribe } from './repository';

export { useCategories } from './hooks/useCategories';
export { useCategoryMutations } from './hooks/useCategoryMutations';
export type { UseCategoryMutationsResult } from './hooks/useCategoryMutations';

export { ColorPicker } from './components/ColorPicker';
export type { ColorPickerProps } from './components/ColorPicker';

export { IconPicker } from './components/IconPicker';
export type { IconPickerProps } from './components/IconPicker';

export { CategoryForm } from './components/CategoryForm';
export type { CategoryFormProps } from './components/CategoryForm';

export { CATEGORY_ICONS, getCategoryIconComponent } from './icons';
export type { CategoryIconItem, IconCategoryKey } from './icons';

export { getCategoryDisplayName } from './utils';
export type { TranslateFunction } from './utils';
