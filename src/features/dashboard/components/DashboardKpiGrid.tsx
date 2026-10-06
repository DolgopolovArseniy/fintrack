import {
  ArrowDownRight,
  Minus,
  Scale,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { MoneyText } from '@/components/common/MoneyText';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import type { CurrencyCode } from '@/lib/currencies';
import { useTranslation } from '@/lib/i18n';
import type { DashboardMetrics, PercentageChangeResult } from '../utils';

export interface DashboardKpiGridProps {
  metrics: DashboardMetrics;
  activeAccountsCount?: number;
  currency?: CurrencyCode;
  className?: string;
}

interface TrendBadgeProps {
  change: PercentageChangeResult;
  metricType: 'income' | 'expense';
}

function TrendBadge({ change, metricType }: TrendBadgeProps) {
  const isPositive =
    metricType === 'income'
      ? change.direction === 'increase'
      : change.direction === 'decrease';

  const isNegative =
    metricType === 'income'
      ? change.direction === 'decrease'
      : change.direction === 'increase';

  const colorClass = isPositive
    ? 'bg-income/10 text-income'
    : isNegative
      ? 'bg-expense/10 text-expense'
      : 'bg-muted text-muted-foreground';

  const sign =
    change.direction === 'increase'
      ? '+'
      : change.direction === 'decrease'
        ? '−'
        : '';

  const Icon =
    change.direction === 'increase'
      ? TrendingUp
      : change.direction === 'decrease'
        ? TrendingDown
        : Minus;

  return (
    <span
      data-slot="kpi-trend-badge"
      data-direction={change.direction}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums select-none',
        colorClass,
      )}
    >
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      <span>
        {sign}
        {change.percent}%
      </span>
    </span>
  );
}

export function DashboardKpiGrid({
  metrics,
  activeAccountsCount = 0,
  currency,
  className,
}: DashboardKpiGridProps) {
  const { t } = useTranslation();

  return (
    <div
      data-slot="dashboard-kpi-grid"
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4',
        className,
      )}
    >
      {/* 1. Net Worth / Total Balance */}
      <Card
        data-slot="kpi-card"
        data-testid="kpi-total-balance"
        className="flex flex-col justify-between p-5"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-sm font-medium">
            {t('dashboard.kpi.totalBalance')}
          </span>
          <div className="bg-secondary text-secondary-foreground flex size-9 items-center justify-center rounded-lg">
            <Wallet className="size-4.5" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-3">
          <MoneyText
            amount={metrics.totalBalance}
            size="kpi"
            currency={currency}
          />
        </div>
        <div className="text-muted-foreground mt-2 text-xs">
          {t('dashboard.kpi.totalBalanceHint', {
            count: activeAccountsCount,
            defaultValue: `${activeAccountsCount} active accounts`,
          })}
        </div>
      </Card>

      {/* 2. Monthly Income */}
      <Card
        data-slot="kpi-card"
        data-testid="kpi-income"
        className="flex flex-col justify-between p-5"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-sm font-medium">
            {t('dashboard.kpi.monthlyIncome')}
          </span>
          <div className="bg-income/10 text-income flex size-9 items-center justify-center rounded-lg">
            <TrendingUp className="size-4.5" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-3">
          <MoneyText
            amount={metrics.currentIncome}
            size="kpi"
            type="income"
            currency={currency}
          />
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <TrendBadge change={metrics.incomeChange} metricType="income" />
          <span className="text-muted-foreground">
            {t('dashboard.kpi.vsLastMonth')}
          </span>
        </div>
      </Card>

      {/* 3. Monthly Expenses */}
      <Card
        data-slot="kpi-card"
        data-testid="kpi-expense"
        className="flex flex-col justify-between p-5"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-sm font-medium">
            {t('dashboard.kpi.monthlyExpenses')}
          </span>
          <div className="bg-expense/10 text-expense flex size-9 items-center justify-center rounded-lg">
            <ArrowDownRight className="size-4.5" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-3">
          <MoneyText
            amount={metrics.currentExpense}
            size="kpi"
            type="expense"
            currency={currency}
          />
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <TrendBadge change={metrics.expenseChange} metricType="expense" />
          <span className="text-muted-foreground">
            {t('dashboard.kpi.vsLastMonth')}
          </span>
        </div>
      </Card>

      {/* 4. Net Savings / Saldo */}
      <Card
        data-slot="kpi-card"
        data-testid="kpi-net-savings"
        className="flex flex-col justify-between p-5"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-sm font-medium">
            {t('dashboard.kpi.netSavings')}
          </span>
          <div className="bg-secondary text-secondary-foreground flex size-9 items-center justify-center rounded-lg">
            <Scale className="size-4.5" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-3">
          <MoneyText
            amount={metrics.netSavings}
            size="kpi"
            showSign={true}
            currency={currency}
          />
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          {metrics.savingsRate !== null ? (
            <span
              data-slot="savings-rate-badge"
              className="bg-secondary text-secondary-foreground inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums"
            >
              {t('dashboard.kpi.savingsRate', {
                rate: metrics.savingsRate,
                defaultValue: `Savings rate: ${metrics.savingsRate}%`,
              })}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {t('dashboard.kpi.noChange')}
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}
