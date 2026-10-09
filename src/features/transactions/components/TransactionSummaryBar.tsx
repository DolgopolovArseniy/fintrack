import { ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react';
import { MoneyText } from '@/components/common/MoneyText';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import type { CurrencyCode } from '@/lib/currencies';
import { useTranslation } from '@/lib/i18n';

export interface TransactionSummaryBarProps {
  totalIncome: number;
  totalExpense: number;
  net: number;
  currency?: CurrencyCode;
  className?: string;
}

export function TransactionSummaryBar({
  totalIncome,
  totalExpense,
  net,
  currency,
  className,
}: TransactionSummaryBarProps) {
  const { t } = useTranslation();

  return (
    <Card
      data-slot="transaction-summary-bar"
      data-testid="transaction-summary-bar"
      className={cn(
        'border-border/60 bg-card/70 grid grid-cols-3 gap-2 p-3 shadow-xs sm:gap-4 sm:p-4',
        className,
      )}
    >
      {/* 1. Income */}
      <div
        className="border-border/40 flex flex-col gap-1 border-r pr-2 sm:pr-4"
        data-testid="summary-income"
      >
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <ArrowDownLeft
            className="text-income size-3.5 shrink-0"
            aria-hidden="true"
          />
          <span className="truncate font-medium">
            {t('transactions.summary.income')}
          </span>
        </div>
        <MoneyText
          amount={totalIncome}
          currency={currency}
          type="income"
          showSign={true}
          size="sm"
          className="font-bold sm:text-base"
        />
      </div>

      {/* 2. Expenses */}
      <div
        className="border-border/40 flex flex-col gap-1 border-r px-1 sm:px-4"
        data-testid="summary-expense"
      >
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <ArrowUpRight
            className="text-expense size-3.5 shrink-0"
            aria-hidden="true"
          />
          <span className="truncate font-medium">
            {t('transactions.summary.expense')}
          </span>
        </div>
        <MoneyText
          amount={totalExpense}
          currency={currency}
          type="expense"
          showSign={true}
          size="sm"
          className="font-bold sm:text-base"
        />
      </div>

      {/* 3. Net */}
      <div
        className="flex flex-col gap-1 pl-2 sm:pl-4"
        data-testid="summary-net"
      >
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Scale
            className="text-muted-foreground size-3.5 shrink-0"
            aria-hidden="true"
          />
          <span className="truncate font-medium">
            {t('transactions.summary.net')}
          </span>
        </div>
        <MoneyText
          amount={net}
          currency={currency}
          showSign={true}
          size="sm"
          className="font-bold sm:text-base"
        />
      </div>
    </Card>
  );
}
