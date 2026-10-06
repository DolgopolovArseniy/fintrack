import * as React from 'react';
import { Banknote, CreditCard, Landmark } from 'lucide-react';
import { MoneyText } from '@/components/common/MoneyText';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import type { CurrencyCode } from '@/lib/currencies';
import type { AccountTotalsResult } from '../hooks/useAccountTotals';

export interface AccountSummaryHeaderProps {
  totals: AccountTotalsResult;
  currency?: CurrencyCode;
  className?: string;
}

export function AccountSummaryHeader({
  totals,
  currency,
  className,
}: AccountSummaryHeaderProps): React.JSX.Element {
  const { t } = useTranslation();

  const fallbackText =
    totals.activeAccountsCount === 1
      ? '1 active account'
      : `${totals.activeAccountsCount} active accounts`;

  const activeAccountsText = t('accounts.summary.activeAccountsCount', {
    count: totals.activeAccountsCount,
    defaultValue: fallbackText,
  });

  return (
    <section
      data-slot="account-summary-header"
      data-testid="account-summary-header"
      aria-label={t('accounts.summary.totalBalance', {
        defaultValue: 'Total Balance',
      })}
      className={cn(
        'bg-card text-card-foreground border-border/60 rounded-xl border p-5 shadow-xs transition-shadow',
        className,
      )}
    >
      {/* Top summary row: Net Worth KPI and Active Accounts badge */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              {t('accounts.summary.totalBalance', {
                defaultValue: 'Total Balance',
              })}
            </span>
            <span
              data-slot="active-accounts-badge"
              className="bg-secondary text-secondary-foreground inline-flex items-center rounded-md px-2 py-0.5 text-xs font-normal select-none"
            >
              {activeAccountsText}
            </span>
          </div>
          <div>
            <MoneyText
              amount={totals.totalBalance}
              currency={currency}
              size="kpi"
              className="font-bold tracking-tight"
            />
          </div>
        </div>
      </div>

      {/* Asset type breakdown chips */}
      <div className="border-border/40 mt-5 grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-3">
        {/* Cash */}
        <div
          data-slot="summary-subtotal-cash"
          data-testid="summary-subtotal-cash"
          className="bg-muted/40 hover:bg-muted/60 flex items-center justify-between rounded-lg p-3 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
            >
              <Banknote className="size-4" />
            </div>
            <span className="text-muted-foreground text-xs font-medium">
              {t('accounts.summary.cashSubtotal', {
                defaultValue: 'Cash',
              })}
            </span>
          </div>
          <MoneyText
            amount={totals.cashBalance}
            currency={currency}
            size="sm"
            className="font-semibold"
          />
        </div>

        {/* Card */}
        <div
          data-slot="summary-subtotal-card"
          data-testid="summary-subtotal-card"
          className="bg-muted/40 hover:bg-muted/60 flex items-center justify-between rounded-lg p-3 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
            >
              <CreditCard className="size-4" />
            </div>
            <span className="text-muted-foreground text-xs font-medium">
              {t('accounts.summary.cardSubtotal', {
                defaultValue: 'Cards',
              })}
            </span>
          </div>
          <MoneyText
            amount={totals.cardBalance}
            currency={currency}
            size="sm"
            className="font-semibold"
          />
        </div>

        {/* Bank */}
        <div
          data-slot="summary-subtotal-bank"
          data-testid="summary-subtotal-bank"
          className="bg-muted/40 hover:bg-muted/60 flex items-center justify-between rounded-lg p-3 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400"
            >
              <Landmark className="size-4" />
            </div>
            <span className="text-muted-foreground text-xs font-medium">
              {t('accounts.summary.bankSubtotal', {
                defaultValue: 'Bank accounts',
              })}
            </span>
          </div>
          <MoneyText
            amount={totals.bankBalance}
            currency={currency}
            size="sm"
            className="font-semibold"
          />
        </div>
      </div>
    </section>
  );
}
