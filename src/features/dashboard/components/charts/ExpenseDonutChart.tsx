import * as React from 'react';
import { CircleEllipsis, PieChart as PieChartIcon } from 'lucide-react';
import { Cell, Pie, PieChart } from 'recharts';
import { CategoryBadge } from '@/components/common/CategoryBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { MoneyText } from '@/components/common/MoneyText';
import { Card } from '@/components/ui/card';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { getCategoryDisplayName, type Category } from '@/features/categories';
import { cn } from '@/lib/cn';
import { DEFAULT_CURRENCY, type CurrencyCode } from '@/lib/currencies';
import { useTranslation } from '@/lib/i18n';
import { DEFAULT_LOCALE, type Locale } from '@/lib/locales';
import { formatMoney } from '@/lib/money';

export interface ExpenseDonutChartProps {
  categoryExpenses: Array<{
    categoryId: string;
    total: number;
    percentage: number;
  }>;
  categories?: readonly Category[];
  currency?: CurrencyCode;
  className?: string;
}

export function ExpenseDonutChart({
  categoryExpenses,
  categories = [],
  currency,
  className,
}: ExpenseDonutChartProps) {
  const { t, i18n } = useTranslation();
  const currentLocale: Locale = i18n.language?.startsWith('ru')
    ? 'ru'
    : DEFAULT_LOCALE;
  const currentCurrency: CurrencyCode = currency ?? DEFAULT_CURRENCY;

  const categoryMap = React.useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const totalExpense = React.useMemo(
    () => categoryExpenses.reduce((sum, item) => sum + item.total, 0),
    [categoryExpenses],
  );

  const chartData = React.useMemo(() => {
    return categoryExpenses.map((item, index) => {
      const isOther = item.categoryId === '__other__';
      const category = isOther ? undefined : categoryMap.get(item.categoryId);
      const name = isOther
        ? t('dashboard.charts.otherCategory')
        : category
          ? getCategoryDisplayName(category, (key, opts) =>
              t(key as never, opts),
            )
          : item.categoryId;

      const fill = isOther
        ? 'var(--cat-slate)'
        : category?.color
          ? `var(--cat-${category.color})`
          : `var(--chart-${(index % 5) + 1})`;

      return {
        id: item.categoryId,
        name,
        total: item.total,
        percentage: item.percentage,
        fill,
        category,
        isOther,
      };
    });
  }, [categoryExpenses, categoryMap, t]);

  const chartConfig: ChartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    chartData.forEach((item) => {
      config[item.id] = {
        label: item.name,
        color: item.fill,
      };
    });
    return config;
  }, [chartData]);

  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const activeItem =
    activeIndex !== null && activeIndex >= 0 && activeIndex < chartData.length
      ? chartData[activeIndex]
      : null;

  const hasExpenses = categoryExpenses.length > 0 && totalExpense > 0;

  return (
    <Card
      data-slot="expense-donut-card"
      data-testid="expense-donut-card"
      className={cn(
        'flex min-h-[380px] flex-col justify-between p-6',
        className,
      )}
    >
      <div>
        <h3 className="text-foreground text-base font-semibold tracking-tight">
          {t('dashboard.charts.expensesByCategory')}
        </h3>
        <p className="text-muted-foreground text-xs">
          {t('dashboard.charts.expensesByCategoryDesc')}
        </p>
      </div>

      {!hasExpenses ? (
        <div className="my-auto py-4">
          <EmptyState
            icon={PieChartIcon}
            title={t('dashboard.charts.emptyExpenses')}
            className="min-h-[220px] border-none bg-transparent p-4"
          />
        </div>
      ) : (
        <div
          role="region"
          aria-label={t('dashboard.charts.expensesByCategory')}
          className="mt-4 flex flex-col justify-between"
        >
          {/* Accessible sr-only table for screen readers (WCAG 2.1 AA) */}
          <table className="sr-only">
            <caption>{t('dashboard.charts.expensesByCategory')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('dashboard.charts.table.category')}</th>
                <th scope="col">{t('dashboard.charts.table.amount')}</th>
                <th scope="col">{t('dashboard.charts.table.share')}</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>
                    {formatMoney(item.total, {
                      locale: currentLocale,
                      currency: currentCurrency,
                    })}
                  </td>
                  <td>{item.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Visual Donut Chart with interactive center label */}
          <div className="relative mx-auto flex aspect-square max-h-[240px] w-full items-center justify-center">
            <ChartContainer
              config={chartConfig}
              className="aspect-square max-h-[240px] w-full"
            >
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="total"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={entry.id}
                      fill={entry.fill}
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                      className={cn(
                        'cursor-pointer transition-opacity duration-200',
                        activeIndex !== null &&
                          activeIndex !== index &&
                          'opacity-60',
                      )}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
              {activeItem ? (
                <>
                  <span className="text-muted-foreground max-w-[130px] truncate text-xs font-medium">
                    {activeItem.name}
                  </span>
                  <MoneyText
                    amount={activeItem.total}
                    currency={currentCurrency}
                    type="expense"
                    size="lg"
                    className="mt-0.5 font-bold"
                  />
                  <span className="text-muted-foreground font-mono text-[11px] font-medium">
                    {activeItem.percentage}%
                  </span>
                </>
              ) : (
                <>
                  <span className="text-muted-foreground text-xs font-medium">
                    {t('dashboard.charts.totalExpense')}
                  </span>
                  <MoneyText
                    amount={totalExpense}
                    currency={currentCurrency}
                    type="expense"
                    size="lg"
                    className="mt-0.5 font-bold"
                  />
                </>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {chartData.map((item, index) => (
              <div
                key={item.id}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                className={cn(
                  'bg-secondary/40 flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors',
                  activeIndex === index && 'bg-secondary ring-border ring-1',
                )}
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  {item.isOther ? (
                    <span className="bg-cat-slate/15 text-cat-slate border-cat-slate/30 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium">
                      <CircleEllipsis
                        className="size-3 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.name}</span>
                    </span>
                  ) : item.category ? (
                    <CategoryBadge
                      name={item.category.name}
                      systemKey={item.category.systemKey}
                      icon={item.category.icon}
                      color={item.category.color}
                      size="sm"
                    />
                  ) : (
                    <span className="truncate font-medium">{item.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 tabular-nums">
                  <span className="text-muted-foreground text-[11px]">
                    {item.percentage}%
                  </span>
                  <MoneyText
                    amount={item.total}
                    currency={currentCurrency}
                    type="expense"
                    size="xs"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
