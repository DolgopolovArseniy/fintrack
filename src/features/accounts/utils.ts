import type { AccountType } from './constants';
import type { Account } from './schemas';

export type TranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

/**
 * Returns the resolved display name for an account.
 * Custom user `name` takes precedence over `systemKey`.
 * If only `systemKey` is present, translates via `accounts.system.<key>`.
 */
export function getAccountDisplayName(
  account: Pick<Account, 'name' | 'systemKey'>,
  t?: TranslateFunction,
): string {
  const trimmedName = account.name?.trim();
  if (trimmedName && trimmedName.length > 0) {
    return trimmedName;
  }

  if (account.systemKey) {
    const key = `accounts.system.${account.systemKey}`;
    const fallback =
      account.systemKey === 'main' ? 'Main account' : account.systemKey;
    return t ? t(key, { defaultValue: fallback }) : fallback;
  }

  return '';
}

/**
 * Returns the localized label for an account type.
 */
export function getAccountTypeLabel(
  type: AccountType,
  t?: TranslateFunction,
): string {
  const defaultLabels: Record<AccountType, string> = {
    cash: 'Cash',
    card: 'Card',
    bank: 'Bank account',
  };

  const key = `accounts.types.${type}`;
  return t
    ? t(key, { defaultValue: defaultLabels[type] })
    : defaultLabels[type];
}

/**
 * Returns the Lucide icon name for an account type.
 */
export function getAccountIconName(type: AccountType): string {
  switch (type) {
    case 'cash':
      return 'banknote';
    case 'card':
      return 'credit-card';
    case 'bank':
      return 'landmark';
    default:
      return 'wallet';
  }
}

/**
 * Sorts accounts deterministically:
 * 1. Active accounts first, archived accounts last.
 * 2. System accounts first (systemKey present), custom accounts second.
 * 3. Custom accounts sorted by creation time (createdAt ascending).
 * 4. Fallback to alphabetical display name comparison.
 */
export function sortAccounts(
  accounts: readonly Account[],
  t?: TranslateFunction,
): Account[] {
  return [...accounts].sort((a, b) => {
    // 1. Active first, archived last
    if (a.archived !== b.archived) {
      return a.archived ? 1 : -1;
    }

    // 2. System accounts before user custom accounts
    const aIsSystem = Boolean(a.systemKey);
    const bIsSystem = Boolean(b.systemKey);
    if (aIsSystem && !bIsSystem) return -1;
    if (!aIsSystem && bIsSystem) return 1;

    // 3. For custom accounts: order by creation time (createdAt ascending)
    const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
    const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
    if (timeA !== timeB) {
      return timeA - timeB;
    }

    // 4. Fallback: alphabetical by display name
    const nameA = getAccountDisplayName(a, t);
    const nameB = getAccountDisplayName(b, t);
    return nameA.localeCompare(nameB);
  });
}
