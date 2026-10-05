import * as React from 'react';
import type { Account } from '@/features/accounts';
import type { Category } from '@/features/categories';
import { cn } from '@/lib/cn';
import type { DayGroup } from '../hooks/useGroupedTransactions';
import type { Transaction } from '../schemas';
import { TransactionDayGroup } from './TransactionDayGroup';

export interface TransactionListProps {
  groups: DayGroup[];
  categories?: Category[];
  accounts?: Account[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  className?: string;
}

export function TransactionList({
  groups,
  categories = [],
  accounts = [],
  onEdit,
  onDelete,
  className,
}: TransactionListProps) {
  const categoriesMap = React.useMemo(() => {
    return new Map<string, Category>(categories.map((c) => [c.id, c]));
  }, [categories]);

  const accountsMap = React.useMemo(() => {
    return new Map<string, Account>(accounts.map((a) => [a.id, a]));
  }, [accounts]);

  return (
    <div
      data-slot="transaction-list"
      data-testid="transaction-list"
      className={cn('space-y-6', className)}
    >
      {groups.map((group) => (
        <TransactionDayGroup
          key={group.date}
          group={group}
          categoriesMap={categoriesMap}
          accountsMap={accountsMap}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
