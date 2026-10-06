import * as React from 'react';
import type { Account } from '../schemas';

export interface AccountTotalsResult {
  totalBalance: number;
  cashBalance: number;
  cardBalance: number;
  bankBalance: number;
  activeAccountsCount: number;
  archivedAccountsCount: number;
}

/**
 * Pure calculation function for account totals and sub-totals by account type.
 * Only active (non-archived) accounts contribute to total and type balances.
 */
export function calculateAccountTotals(
  accounts: readonly Account[],
): AccountTotalsResult {
  let totalBalance = 0;
  let cashBalance = 0;
  let cardBalance = 0;
  let bankBalance = 0;
  let activeAccountsCount = 0;
  let archivedAccountsCount = 0;

  for (const account of accounts) {
    if (account.archived) {
      archivedAccountsCount += 1;
    } else {
      activeAccountsCount += 1;
      totalBalance += account.balance;
      switch (account.type) {
        case 'cash':
          cashBalance += account.balance;
          break;
        case 'card':
          cardBalance += account.balance;
          break;
        case 'bank':
          bankBalance += account.balance;
          break;
      }
    }
  }

  return {
    totalBalance,
    cashBalance,
    cardBalance,
    bankBalance,
    activeAccountsCount,
    archivedAccountsCount,
  };
}

/**
 * Hook providing memoized calculation of net worth and type subtotals across accounts.
 */
export function useAccountTotals(
  accounts: readonly Account[],
): AccountTotalsResult {
  return React.useMemo(() => calculateAccountTotals(accounts), [accounts]);
}
