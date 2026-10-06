import * as React from 'react';
import { TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { EmptyState } from '@/components/common/EmptyState';
import { Card } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { cn } from '@/lib/cn';
import { DEFAULT_CURRENCY, type CurrencyCode } from '@/lib/currencies';
import type { YearMonth } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n';
import { DEFAULT_LOCALE, type Locale } from '@/lib/locales';
import { formatMoney, fromMinorUnits } from '@/lib/money';

export interface MonthlyBarChartProps {
  monthlyHistory: Array<{
    month: YearMonth;
    label: string;
    income: number;
    expense: number;
  }>;
  currency?: CurrencyCode;
  className?: string;
}

function formatCompactYAxis(valueInMinor: number): string {
  const major = fromMinorUnits(valueInMinor);
  if (major === 0) return '0';
  if (Math.abs(major) >= 1_000_000) {
    const formatted = (major / 1_000_000).toFixed(
      major % 1_000_000 === 0 ? 0 : 1,
    );
    return `${formatted}M`;
  }
  if (Math.abs(major) >= 1_000) {
    const formatted = (major / 1_000).toFixed(major % 1_000 === 0 ? 0 : 1);
    return `${formatted}k`;
  }
  return String(major);
}

export function MonthlyBarChart({
  monthlyHistory,
  currency,
  className,
}: MonthlyBarChartProps) {
  const { t, i18n } = useTranslation();
  const currentLocale: Locale = i18n.language?.startsWith('ru')
    ? 'ru'
    : DEFAULT_LOCALE;
  const currentCurrency: CurrencyCode = currency ?? DEFAULT_CURRENCY;

  const hasData = React.useMemo(
    () => monthlyHistory.some((m) => m.income > 0 || m.expense > 0),
    [monthlyHistory],
  );

  const chartConfig: ChartConfig = React.useMemo(
    () => ({
      income: {
        label: t('dashboard.charts.table.income'),
        color: 'var(--income)',
      },
      expense: {
        label: t('dashboard.charts.table.expense'),
        color: 'var(--expense)',
      },
    }),
    [t],
  );

  return (
    <Card
      data-slot="monthly-bar-card"
      data-testid="monthly-bar-card"
      className={cn(
        'flex min-h-[380px] flex-col justify-between p-6',
        className,
      )}
    >
      <div>
        <h3 className="text-foreground text-base font-semibold tracking-tight">
          {t('dashboard.charts.incomeVsExpense')}
        </h3>
        <p className="text-muted-foreground text-xs">
          {t('dashboard.charts.incomeVsExpenseDesc')}
        </p>
      </div>

      {!hasData ? (
        <div className="my-auto py-4">
          <EmptyState
            icon={TrendingUp}
            title={t('dashboard.charts.emptyHistory')}
            className="min-h-[220px] border-none bg-transparent p-4"
          />
        </div>
      ) : (
        <div
          role="region"
          aria-label={t('dashboard.charts.incomeVsExpense')}
          className="mt-4 flex flex-1 flex-col justify-between"
        >
          {/* Accessible sr-only table for screen readers (WCAG 2.1 AA) */}
          <table className="sr-only">
            <caption>{t('dashboard.charts.incomeVsExpense')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('dashboard.charts.table.month')}</th>
                <th scope="col">{t('dashboard.charts.table.income')}</th>
                <th scope="col">{t('dashboard.charts.table.expense')}</th>
                <th scope="col">{t('dashboard.charts.table.net')}</th>
              </tr>
            </thead>
            <tbody>
              {monthlyHistory.map((item) => (
                <tr key={item.month}>
                  <td>{item.label}</td>
                  <td>
                    {formatMoney(item.income, {
                      locale: currentLocale,
                      currency: currentCurrency,
                    })}
                  </td>
                  <td>
                    {formatMoney(item.expense, {
                      locale: currentLocale,
                      currency: currentCurrency,
                    })}
                  </td>
                  <td>
                    {formatMoney(item.income - item.expense, {
                      locale: currentLocale,
                      currency: currentCurrency,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Visual Bar Chart */}
          <div className="w-full">
            <ChartContainer
              config={chartConfig}
              className="aspect-video max-h-[260px] w-full"
            >
              <BarChart
                data={monthlyHistory}
                margin={{ top: 12, right: 12, left: -10, bottom: 4 }}
              >
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  className="stroke-border/40"
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatCompactYAxis}
                  width={42}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => (
                        <span className="text-foreground font-mono font-medium tabular-nums">
                          {typeof value === 'number'
                            ? formatMoney(value, {
                                locale: currentLocale,
                                currency: currentCurrency,
                              })
                            : String(value)}
                        </span>
                      )}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="income"
                  name="income"
                  fill="var(--income)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expense"
                  name="expense"
                  fill="var(--expense)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      )}
    </Card>
  );
}
