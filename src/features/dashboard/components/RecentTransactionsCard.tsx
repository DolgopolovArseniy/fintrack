import * as React from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Account } from '@/features/accounts';
import type { Category } from '@/features/categories';
import { TransactionItem, type Transaction } from '@/features/transactions';
import { cn } from '@/lib/cn';
import type { YearMonth } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n';

export interface RecentTransactionsCardProps {
  transactions: Transaction[];
  categories?: readonly Category[];
  accounts?: readonly Account[];
  selectedMonth?: YearMonth;
  onAddTransaction?: () => void;
  onEditTransaction?: (transaction: Transaction) => void;
  onDeleteTransaction?: (transaction: Transaction) => void;
  className?: string;
}

export function RecentTransactionsCard({
  transactions,
  categories = [],
  accounts = [],
  selectedMonth,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  className,
}: RecentTransactionsCardProps) {
  const { t } = useTranslation();

  const categoryMap = React.useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const accountMap = React.useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );

  const recentTransactions = React.useMemo(
    () => transactions.slice(0, 5),
    [transactions],
  );

  const viewAllUrl = selectedMonth
    ? `/app/transactions?month=${selectedMonth}`
    : '/app/transactions';

  return (
    <Card
      data-slot="recent-transactions-card"
      data-testid="recent-transactions-card"
      className={cn('p-6', className)}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-foreground text-base font-semibold tracking-tight">
            {t('dashboard.recentTransactions.title')}
          </h3>
        </div>

        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          <Link to={viewAllUrl} data-testid="view-all-transactions-link">
            {t('dashboard.recentTransactions.viewAll')}
            <ArrowRight className="ml-1.5 size-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      {recentTransactions.length === 0 ? (
        <div className="py-4">
          <EmptyState
            title={t('dashboard.recentTransactions.empty')}
            action={
              onAddTransaction ? (
                <Button
                  onClick={onAddTransaction}
                  size="sm"
                  data-testid="add-first-transaction-button"
                >
                  <Plus className="mr-1.5 size-4" aria-hidden="true" />
                  {t('dashboard.recentTransactions.addFirst')}
                </Button>
              ) : null
            }
            className="min-h-[180px] border-none bg-transparent p-4"
          />
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {recentTransactions.map((tx) => (
            <TransactionItem
              key={tx.id}
              transaction={tx}
              category={categoryMap.get(tx.categoryId)}
              account={accountMap.get(tx.accountId)}
              onEdit={onEditTransaction}
              onDelete={onDeleteTransaction}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
