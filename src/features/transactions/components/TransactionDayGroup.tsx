import * as React from 'react';
import { MoneyText } from '@/components/common/MoneyText';
import type { Account } from '@/features/accounts';
import type { Category } from '@/features/categories';
import { cn } from '@/lib/cn';
import type { CurrencyCode } from '@/lib/currencies';
import { formatIsoDate, isValidIsoDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n';
import { DEFAULT_LOCALE, type Locale } from '@/lib/locales';
import type { DayGroup } from '../hooks/useGroupedTransactions';
import type { Transaction } from '../schemas';
import { TransactionItem } from './TransactionItem';

export interface TransactionDayGroupProps {
  group: DayGroup;
  categoriesMap?: Map<string, Category>;
  accountsMap?: Map<string, Account>;
  currency?: CurrencyCode;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  className?: string;
}

export function TransactionDayGroup({
  group,
  categoriesMap,
  accountsMap,
  currency,
  onEdit,
  onDelete,
  className,
}: TransactionDayGroupProps) {
  const { i18n } = useTranslation();

  const currentLocale: Locale = i18n.language?.startsWith('ru')
    ? 'ru'
    : DEFAULT_LOCALE;

  const formattedDate = React.useMemo(() => {
    if (!isValidIsoDate(group.date)) {
      return group.date;
    }
    return formatIsoDate(group.date, currentLocale, 'medium');
  }, [group.date, currentLocale]);

  return (
    <div
      data-slot="transaction-day-group"
      data-testid={`day-group-${group.date}`}
      className={cn('space-y-2', className)}
    >
      {/* Day header */}
      <div className="flex items-center justify-between px-1 text-sm">
        <span
          className="text-muted-foreground font-semibold"
          data-testid="day-group-date"
        >
          {formattedDate}
        </span>
        <div className="flex items-center gap-1.5" data-testid="day-group-net">
          <span className="text-muted-foreground text-xs font-normal">
            {group.net >= 0 ? '+' : '−'}
          </span>
          <MoneyText
            amount={Math.abs(group.net)}
            currency={currency}
            type={
              group.net > 0 ? 'income' : group.net < 0 ? 'expense' : 'neutral'
            }
            size="xs"
            className="font-medium"
          />
        </div>
      </div>

      {/* Transactions list for the day */}
      <div className="space-y-1.5">
        {group.transactions.map((tx) => (
          <TransactionItem
            key={tx.id}
            transaction={tx}
            category={categoriesMap?.get(tx.categoryId)}
            account={accountsMap?.get(tx.accountId)}
            currency={currency}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
