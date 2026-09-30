import {
  ArrowDownRight,
  ArrowUpRight,
  Coffee,
  CreditCard,
  Plus,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { AppLayout } from '@/app/layouts/AppLayout';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

function AppContent() {
  const { t } = useTranslation();

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {t('dashboard.overview')}
            </h2>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {t('dashboard.description')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-1.5 shadow-xs">
              <Plus className="size-4" />
              <span>{t('dashboard.addTransaction')}</span>
            </Button>
          </div>
        </div>

        {/* KPI Financial Cards (Stripe / Linear metrics) */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Total Net Worth */}
          <Card className="p-5">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>{t('dashboard.totalBalance')}</span>
              <div className="flex size-7 items-center justify-center rounded-md bg-secondary text-foreground">
                <CreditCard className="size-3.5" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
              $24,850.00
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs">
              <span className="inline-flex items-center gap-0.5 rounded-md bg-income/10 px-1.5 py-0.5 font-medium text-income">
                <ArrowUpRight className="size-3" />
                +12.4%
              </span>
              <span className="text-muted-foreground">
                {t('dashboard.vsLastMonth')}
              </span>
            </div>
          </Card>

          {/* Monthly Inflow */}
          <Card className="p-5">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>{t('dashboard.monthlyIncome')}</span>
              <div className="flex size-7 items-center justify-center rounded-md bg-income/10 text-income">
                <TrendingUp className="size-3.5" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-income tabular-nums sm:text-3xl">
              +$8,420.00
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>+8.1%</span>
              <span>{t('dashboard.vsLastMonth')}</span>
            </div>
          </Card>

          {/* Monthly Outflow */}
          <Card className="p-5 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>{t('dashboard.monthlyExpenses')}</span>
              <div className="flex size-7 items-center justify-center rounded-md bg-expense/10 text-expense">
                <ArrowDownRight className="size-3.5" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-3xl">
              -$3,180.00
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="text-income">-3.4%</span>
              <span>{t('dashboard.vsLastMonth')}</span>
            </div>
          </Card>
        </div>

        {/* Buttons & Design System Micro-states Showcase */}
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

        {/* Recent Transactions Table Preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>{t('dashboard.recentActivity')}</CardTitle>
              <CardDescription>{t('nav.transactions')}</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
            >
              {t('dashboard.viewAll')}
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border/60">
              {/* Row 1 */}
              <div className="flex items-center justify-between py-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <TrendingUp className="size-4" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">
                      Stripe Payout
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Main Checking • 28 Sep
                    </div>
                  </div>
                </div>
                <div className="font-medium text-income tabular-nums">
                  +$4,250.00
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex items-center justify-between py-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-cat-pink/15 text-cat-pink">
                    <ShoppingBag className="size-4" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">
                      Apple Store
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Credit Card • 26 Sep
                    </div>
                  </div>
                </div>
                <div className="font-medium text-foreground tabular-nums">
                  -$1,299.00
                </div>
              </div>

              {/* Row 3 */}
              <div className="flex items-center justify-between py-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-cat-amber/15 text-cat-amber">
                    <Coffee className="size-4" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">
                      Blue Bottle Coffee
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Daily Debit • 25 Sep
                    </div>
                  </div>
                </div>
                <div className="font-medium text-foreground tabular-nums">
                  -$6.50
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
