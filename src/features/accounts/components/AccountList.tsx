import * as React from 'react';
import { cn } from '@/lib/cn';
import type { CurrencyCode } from '@/lib/currencies';
import type { Account } from '../schemas';
import { AccountCard } from './AccountCard';

export interface AccountListProps {
  accounts: Account[];
  onEdit: (account: Account) => void;
  onArchive: (account: Account) => void;
  onUnarchive: (account: Account) => void;
  onRecalculate: (account: Account) => void;
  recalculatingAccountId?: string | null;
  currency?: CurrencyCode;
  emptyState?: React.ReactNode;
  className?: string;
}

export function AccountList({
  accounts,
  onEdit,
  onArchive,
  onUnarchive,
  onRecalculate,
  recalculatingAccountId,
  currency,
  emptyState,
  className,
}: AccountListProps): React.JSX.Element {
  if (accounts.length === 0) {
    return <>{emptyState ?? null}</>;
  }

  // Count active accounts to protect against archiving the last active account (AC-5)
  const activeAccountsCount = accounts.filter((acc) => !acc.archived).length;
  const canArchiveActive = activeAccountsCount > 1;

  return (
    <div
      data-slot="account-list"
      data-testid="account-list"
      className={cn(
        'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3',
        className,
      )}
    >
      {accounts.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          onEdit={onEdit}
          onArchive={onArchive}
          onUnarchive={onUnarchive}
          onRecalculate={onRecalculate}
          isRecalculating={recalculatingAccountId === account.id}
          canArchive={account.archived ? true : canArchiveActive}
          currency={currency}
        />
      ))}
    </div>
  );
}
