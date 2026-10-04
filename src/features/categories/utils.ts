import { DEFAULT_CATEGORIES } from './constants';
import type { Category } from './schemas';

export type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

const DEFAULT_CATEGORY_INDEX_MAP = new Map<string, number>(
  DEFAULT_CATEGORIES.map((cat, idx) => [cat.systemKey, idx]),
);

/**
 * Returns the resolved display name for a category.
 * Custom user `name` takes precedence over `systemKey`.
 * If only `systemKey` is present, translates via `categories.system.<key>`.
 */
export function getCategoryDisplayName(
  category: Pick<Category, 'name' | 'systemKey'>,
  t?: TranslateFunction,
): string {
  const trimmedName = category.name?.trim();
  if (trimmedName && trimmedName.length > 0) {
    return trimmedName;
  }

  if (category.systemKey) {
    const key = `categories.system.${category.systemKey}`;
    return t
      ? t(key, { defaultValue: category.systemKey })
      : category.systemKey;
  }

  return '';
}

/**
 * Sorts categories deterministically (§7.3 in F04 spec):
 * 1. Active categories first, archived categories last.
 * 2. System categories first (in predefined default order), custom categories second.
 * 3. Custom categories sorted by creation time (createdAt ascending), so newly created categories appear at the end.
 * 4. Fallback to alphabetical display name comparison.
 */
export function sortCategories(
  categories: readonly Category[],
  t?: TranslateFunction,
): Category[] {
  return [...categories].sort((a, b) => {
    // 1. Active first, archived last
    if (a.archived !== b.archived) {
      return a.archived ? 1 : -1;
    }

    // 2. System categories before user custom categories
    const aIsSystem = Boolean(a.systemKey);
    const bIsSystem = Boolean(b.systemKey);
    if (aIsSystem && !bIsSystem) return -1;
    if (!aIsSystem && bIsSystem) return 1;

    // If both are system categories, preserve standard catalog order
    if (aIsSystem && bIsSystem && a.systemKey && b.systemKey) {
      const indexA = DEFAULT_CATEGORY_INDEX_MAP.get(a.systemKey) ?? 999;
      const indexB = DEFAULT_CATEGORY_INDEX_MAP.get(b.systemKey) ?? 999;
      if (indexA !== indexB) {
        return indexA - indexB;
      }
    }

    // 3. For custom categories: order by creation time (createdAt ascending)
    const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
    const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
    if (timeA !== timeB) {
      return timeA - timeB;
    }

    // 4. Fallback: alphabetical by display name
    const nameA = getCategoryDisplayName(a, t);
    const nameB = getCategoryDisplayName(b, t);
    return nameA.localeCompare(nameB);
  });
}
