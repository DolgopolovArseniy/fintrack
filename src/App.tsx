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
import { I18nProvider } from '@/app/providers/I18nProvider';
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
            <h2 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
              {t('dashboard.overview')}
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm">
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
            <div className="text-muted-foreground flex items-center justify-between text-xs font-medium">
              <span>{t('dashboard.totalBalance')}</span>
              <div className="bg-secondary text-foreground flex size-7 items-center justify-center rounded-md">
                <CreditCard className="size-3.5" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
              $24,850.00
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-xs">
              <span className="bg-income/10 text-income inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium">
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
            <div className="text-muted-foreground flex items-center justify-between text-xs font-medium">
              <span>{t('dashboard.monthlyIncome')}</span>
              <div className="bg-income/10 text-income flex size-7 items-center justify-center rounded-md">
                <TrendingUp className="size-3.5" />
              </div>
            </div>
            <div className="text-income mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
              +$8,420.00
            </div>
            <div className="text-muted-foreground mt-2.5 flex items-center gap-1.5 text-xs">
              <span>+8.1%</span>
              <span>{t('dashboard.vsLastMonth')}</span>
            </div>
          </Card>

          {/* Monthly Outflow */}
          <Card className="p-5 sm:col-span-2 lg:col-span-1">
            <div className="text-muted-foreground flex items-center justify-between text-xs font-medium">
              <span>{t('dashboard.monthlyExpenses')}</span>
              <div className="bg-expense/10 text-expense flex size-7 items-center justify-center rounded-md">
                <ArrowDownRight className="size-3.5" />
              </div>
            </div>
            <div className="text-foreground mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
              -$3,180.00
            </div>
            <div className="text-muted-foreground mt-2.5 flex items-center gap-1.5 text-xs">
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
              className="text-muted-foreground text-xs"
            >
              {t('dashboard.viewAll')}
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-border/60 divide-y">
              {/* Row 1 */}
              <div className="flex items-center justify-between py-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                    <TrendingUp className="size-4" />
                  </div>
                  <div>
                    <div className="text-foreground font-medium">
                      Stripe Payout
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Main Checking • 28 Sep
                    </div>
                  </div>
                </div>
                <div className="text-income font-medium tabular-nums">
                  +$4,250.00
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex items-center justify-between py-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-cat-pink/15 text-cat-pink flex size-8 items-center justify-center rounded-lg">
                    <ShoppingBag className="size-4" />
                  </div>
                  <div>
                    <div className="text-foreground font-medium">
                      Apple Store
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Credit Card • 26 Sep
                    </div>
                  </div>
                </div>
                <div className="text-foreground font-medium tabular-nums">
                  -$1,299.00
                </div>
              </div>

              {/* Row 3 */}
              <div className="flex items-center justify-between py-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-cat-amber/15 text-cat-amber flex size-8 items-center justify-center rounded-lg">
                    <Coffee className="size-4" />
                  </div>
                  <div>
                    <div className="text-foreground font-medium">
                      Blue Bottle Coffee
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Daily Debit • 25 Sep
                    </div>
                  </div>
                </div>
                <div className="text-foreground font-medium tabular-nums">
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
      <I18nProvider>
        <AppContent />
      </I18nProvider>
    </ThemeProvider>
  );
}
