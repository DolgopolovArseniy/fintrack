import { AlertCircle, AlertTriangle, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { MoneyText } from '@/components/common/MoneyText';
import { cn } from '@/lib/cn';
import { useTranslation } from '@/lib/i18n';
import type { BudgetSummaryTotals } from '../schemas';
import { BudgetProgressBar } from './BudgetProgressBar';

export interface BudgetSummaryHeaderProps {
  summaryTotals: BudgetSummaryTotals;
  className?: string;
}

export function BudgetSummaryHeader({
  summaryTotals,
  className,
}: BudgetSummaryHeaderProps) {
  const { t } = useTranslation();

  const isOverspent = summaryTotals.totalSpent > summaryTotals.totalLimit;

  return (
    <Card
      data-testid="budget-summary-header"
      className={cn('bg-card border-border/80 p-5 shadow-xs', className)}
    >
      <CardContent className="flex flex-col gap-4 p-0">
        {/* Top metrics grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Total Budgeted */}
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              {t('budgets.summary.totalBudget')}
            </span>
            <MoneyText
              amount={summaryTotals.totalLimit}
              type="neutral"
              size="lg"
            />
          </div>

          {/* Total Spent */}
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              {t('budgets.summary.totalSpent')}
            </span>
            <MoneyText
              amount={summaryTotals.totalSpent}
              type="neutral"
              size="lg"
            />
          </div>

          {/* Remaining / Overspent */}
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              {isOverspent
                ? t('budgets.summary.overspent')
                : t('budgets.summary.remaining')}
            </span>
            {isOverspent ? (
              <MoneyText
                amount={summaryTotals.totalOverspent}
                type="expense"
                size="lg"
                className="text-destructive font-bold"
              />
            ) : (
              <MoneyText
                amount={summaryTotals.totalRemaining}
                type="income"
                size="lg"
                className="font-bold text-emerald-600 dark:text-emerald-400"
              />
            )}
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">
              {t('budgets.summary.progress')}
            </span>
            <span className="font-semibold tabular-nums">
              {summaryTotals.overallProgress}%
            </span>
          </div>
          <BudgetProgressBar
            progress={summaryTotals.overallProgress}
            status={summaryTotals.overallStatus}
            ariaLabel={t('budgets.summary.progress')}
          />
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span
            data-slot="summary-normal-badge"
            className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-600 dark:text-emerald-400"
          >
            <Check aria-hidden="true" className="size-3" />
            <span>
              {t('budgets.summary.statusNormal', {
                count: summaryTotals.normalCount,
              })}
            </span>
          </span>

          <span
            data-slot="summary-warning-badge"
            className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-medium text-amber-600 dark:text-amber-400"
          >
            <AlertCircle aria-hidden="true" className="size-3" />
            <span>
              {t('budgets.summary.statusWarning', {
                count: summaryTotals.warningCount,
              })}
            </span>
          </span>

          <span
            data-slot="summary-exceeded-badge"
            className="border-destructive/20 bg-destructive/10 text-destructive inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-medium"
          >
            <AlertTriangle aria-hidden="true" className="size-3" />
            <span>
              {t('budgets.summary.statusExceeded', {
                count: summaryTotals.exceededCount,
              })}
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
