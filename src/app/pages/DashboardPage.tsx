import {
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';

const MOCK_TOTAL_BALANCE = '$24,850.00';
const MOCK_TOTAL_CHANGE = '+12.4%';
const MOCK_INCOME_TOTAL = '+$8,420.00';
const MOCK_INCOME_CHANGE = '+8.1%';
const MOCK_EXPENSE_TOTAL = '-$3,180.00';
const MOCK_EXPENSE_CHANGE = '-3.4%';

export function DashboardPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            {t('dashboard.overview')}
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {t('dashboard.description')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1.5 shadow-xs">
            <Plus className="size-4" aria-hidden="true" />
            <span>{t('dashboard.addTransaction')}</span>
          </Button>
        </div>
      </div>

      {/* KPI Financial Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Net Worth */}
        <Card className="p-5">
          <div className="text-muted-foreground flex items-center justify-between text-xs font-medium">
            <span>{t('dashboard.totalBalance')}</span>
            <div className="bg-secondary text-foreground flex size-7 items-center justify-center rounded-md">
              <CreditCard className="size-3.5" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            {MOCK_TOTAL_BALANCE}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs">
            <span className="bg-income/10 text-income inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium">
              <ArrowUpRight className="size-3" aria-hidden="true" />
              <span>{MOCK_TOTAL_CHANGE}</span>
            </span>
            <span className="text-muted-foreground">
              {t('dashboard.vsLastMonth')}
            </span>
          </div>
        </Card>

        {/* Monthly Inflow */}
        <Card className="p-5">
          <div className="text-muted-foreground flex items-center justify-between text-xs font-medium">
            <span>{t('dashboard.monthlyIncome')}</span>
            <div className="bg-income/10 text-income flex size-7 items-center justify-center rounded-md">
              <TrendingUp className="size-3.5" aria-hidden="true" />
            </div>
          </div>
          <div className="text-income mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            {MOCK_INCOME_TOTAL}
          </div>
          <div className="text-muted-foreground mt-2.5 flex items-center gap-1.5 text-xs">
            <span>{MOCK_INCOME_CHANGE}</span>
            <span>{t('dashboard.vsLastMonth')}</span>
          </div>
        </Card>

        {/* Monthly Outflow */}
        <Card className="p-5 sm:col-span-2 lg:col-span-1">
          <div className="text-muted-foreground flex items-center justify-between text-xs font-medium">
            <span>{t('dashboard.monthlyExpenses')}</span>
            <div className="bg-expense/10 text-expense flex size-7 items-center justify-center rounded-md">
              <ArrowDownRight className="size-3.5" aria-hidden="true" />
            </div>
          </div>
          <div className="text-foreground mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            {MOCK_EXPENSE_TOTAL}
          </div>
          <div className="text-muted-foreground mt-2.5 flex items-center gap-1.5 text-xs">
            <span className="text-income">{MOCK_EXPENSE_CHANGE}</span>
            <span>{t('dashboard.vsLastMonth')}</span>
          </div>
        </Card>
      </div>

      {/* Buttons Showcase */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{t('dashboard.quickActions')}</CardTitle>
          <CardDescription>{t('dashboard.welcome')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2.5 pt-0">
          <Button variant="default">{t('common.actions.primary')}</Button>
          <Button variant="secondary">{t('common.actions.secondary')}</Button>
          <Button variant="outline">{t('common.actions.outline')}</Button>
          <Button variant="destructive">
            {t('common.actions.destructive')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
