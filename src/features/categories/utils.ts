import type { Category } from './schemas';

export type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

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
