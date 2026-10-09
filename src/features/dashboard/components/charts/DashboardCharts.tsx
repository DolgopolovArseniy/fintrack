import * as React from 'react';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import type { Category } from '@/features/categories';
import { cn } from '@/lib/cn';
import type { CurrencyCode } from '@/lib/currencies';
import type { DashboardData } from '../../hooks/useDashboardData';

const ExpenseDonutChart = React.lazy(() =>
  import('./ExpenseDonutChart').then((mod) => ({
    default: mod.ExpenseDonutChart,
  })),
);

const MonthlyBarChart = React.lazy(() =>
  import('./MonthlyBarChart').then((mod) => ({
    default: mod.MonthlyBarChart,
  })),
);

export interface DashboardChartsProps {
  categoryExpenses: DashboardData['categoryExpenses'];
  monthlyHistory: DashboardData['monthlyHistory'];
  categories?: readonly Category[];
  currency?: CurrencyCode;
  className?: string;
}

export function DashboardCharts({
  categoryExpenses,
  monthlyHistory,
  categories,
  currency,
  className,
}: DashboardChartsProps) {
  return (
    <div
      data-slot="dashboard-charts"
      data-testid="dashboard-charts"
      className={cn('grid grid-cols-1 gap-6 lg:grid-cols-2', className)}
    >
      <React.Suspense fallback={<LoadingSkeleton variant="chart" />}>
        <ExpenseDonutChart
          categoryExpenses={categoryExpenses}
          categories={categories}
          currency={currency}
        />
      </React.Suspense>

      <React.Suspense fallback={<LoadingSkeleton variant="chart" />}>
        <MonthlyBarChart monthlyHistory={monthlyHistory} currency={currency} />
      </React.Suspense>
    </div>
  );
}
