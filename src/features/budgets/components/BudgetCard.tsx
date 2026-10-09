import * as React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  MoreHorizontal,
  Pencil,
  Receipt,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CategoryBadge } from '@/components/common/CategoryBadge';
import { MoneyText } from '@/components/common/MoneyText';
import type { Category } from '@/features/categories';
import { cn } from '@/lib/cn';
import { useTranslation } from '@/lib/i18n';
import type { EnrichedBudget } from '../schemas';
import { BudgetProgressBar } from './BudgetProgressBar';

export interface BudgetCardProps {
  budget: EnrichedBudget;
  category?: Category;
  onEdit?: (budget: EnrichedBudget) => void;
  onDelete?: (budget: EnrichedBudget) => void;
  onViewTransactions?: (budget: EnrichedBudget) => void;
  className?: string;
}

export function BudgetCard({
  budget,
  category,
  onEdit,
  onDelete,
  onViewTransactions,
  className,
}: BudgetCardProps) {
  const { t } = useTranslation();

  const isOverspent = budget.spent > budget.limit;

  const statusBadge = React.useMemo(() => {
    switch (budget.status) {
      case 'normal':
        return (
          <span
            data-slot="budget-status-badge"
            className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 select-none dark:text-emerald-400"
          >
            <Check aria-hidden="true" className="size-3" />
            <span>{t('budgets.card.statusNormal')}</span>
          </span>
        );
      case 'warning':
        return (
          <span
            data-slot="budget-status-badge"
            className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 select-none dark:text-amber-400"
          >
            <AlertCircle aria-hidden="true" className="size-3" />
            <span>{t('budgets.card.statusWarning')}</span>
          </span>
        );
      case 'exceeded':
        return (
          <span
            data-slot="budget-status-badge"
            className="border-destructive/20 bg-destructive/10 text-destructive inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium select-none"
          >
            <AlertTriangle aria-hidden="true" className="size-3" />
            <span>{t('budgets.card.statusExceeded')}</span>
          </span>
        );
    }
  }, [budget.status, t]);

  const percentageBadgeColor = React.useMemo(() => {
    switch (budget.status) {
      case 'normal':
        return 'bg-muted text-foreground';
      case 'warning':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
      case 'exceeded':
        return 'bg-destructive/15 text-destructive font-semibold';
    }
  }, [budget.status]);

  return (
    <Card
      data-testid="budget-card"
      data-budget-id={budget.id}
      data-category-id={budget.categoryId}
      className={cn(
        'gap-4 p-5 transition-shadow hover:shadow-md',
        budget.status === 'exceeded' &&
          'border-destructive/30 dark:border-destructive/40',
        className,
      )}
    >
      {/* Header: Category on left, Status & Menu on right */}
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-0">
        <div className="flex min-w-0 items-center gap-2">
          <CategoryBadge
            name={category?.name}
            systemKey={category?.systemKey}
            icon={category?.icon}
            color={category?.color}
            archived={category?.archived}
            size="md"
          />
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {statusBadge}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Actions"
                data-testid={`budget-actions-${budget.id}`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(budget)}>
                  <Pencil className="size-4" />
                  <span>{t('budgets.actions.edit')}</span>
                </DropdownMenuItem>
              )}
              {onViewTransactions && (
                <DropdownMenuItem onClick={() => onViewTransactions(budget)}>
                  <Receipt className="size-4" />
                  <span>{t('budgets.card.viewTransactions')}</span>
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete(budget)}
                  >
                    <Trash2 className="size-4" />
                    <span>{t('budgets.actions.delete')}</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {/* Content: Amounts, Progress & Remaining */}
      <CardContent className="flex flex-col gap-3 p-0">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-1.5 text-sm">
            <span className="text-muted-foreground">
              {t('budgets.summary.totalSpent')}:
            </span>
            <MoneyText
              amount={budget.spent}
              type="neutral"
              size="md"
              className="font-semibold"
            />
            <span className="text-muted-foreground">/</span>
            <MoneyText
              amount={budget.limit}
              type="neutral"
              size="sm"
              className="text-muted-foreground"
            />
          </div>

          <span
            data-slot="budget-percentage"
            className={cn(
              'rounded-md px-2 py-0.5 text-xs font-medium tabular-nums select-none',
              percentageBadgeColor,
            )}
          >
            {budget.progress}%
          </span>
        </div>

        <BudgetProgressBar
          progress={budget.progress}
          status={budget.status}
          ariaLabel={category?.name ?? budget.categoryId}
        />

        <div className="flex items-center justify-between pt-0.5 text-xs">
          {isOverspent ? (
            <div className="text-destructive flex items-center gap-1 font-medium">
              <span>
                {t('budgets.card.overspent', { amount: '' })
                  .replace('{{amount}}', '')
                  .trim()}
                :
              </span>
              <MoneyText
                amount={budget.overspent}
                type="expense"
                size="xs"
                className="font-bold"
              />
            </div>
          ) : (
            <div className="text-muted-foreground flex items-center gap-1">
              <span>
                {t('budgets.card.remaining', { amount: '' })
                  .replace('{{amount}}', '')
                  .trim()}
                :
              </span>
              <MoneyText
                amount={budget.remaining}
                type="income"
                size="xs"
                className="font-semibold text-emerald-600 dark:text-emerald-400"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
