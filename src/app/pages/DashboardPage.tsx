import * as React from 'react';
import { Plus } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { MonthNavigator } from '@/components/common/MonthNavigator';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { ResponsiveDialog } from '@/components/common/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { useAccounts } from '@/features/accounts';
import { useAuth } from '@/features/auth';
import { useCategories } from '@/features/categories';
import {
  DashboardCharts,
  DashboardKpiGrid,
  RecentTransactionsCard,
  useDashboardData,
} from '@/features/dashboard';
import {
  TransactionForm,
  useTransactionMutations,
  type Transaction,
  type TransactionInput,
} from '@/features/transactions';
import {
  currentYearMonth,
  isValidYearMonth,
  type YearMonth,
} from '@/lib/dates';
import { useTranslation } from '@/lib/i18n';

export function DashboardPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const monthParam = searchParams.get('month');
  const selectedMonth: YearMonth =
    monthParam && isValidYearMonth(monthParam)
      ? monthParam
      : currentYearMonth();

  const handleMonthChange = React.useCallback(
    (newMonth: YearMonth) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (newMonth === currentYearMonth()) {
            next.delete('month');
          } else {
            next.set('month', newMonth);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const dashboardState = useDashboardData(selectedMonth);
  const accountsState = useAccounts();
  const categoriesState = useCategories();

  const accounts = React.useMemo(
    () => (accountsState.status === 'success' ? accountsState.data : []),
    [accountsState],
  );
  const categories = React.useMemo(
    () => (categoriesState.status === 'success' ? categoriesState.data : []),
    [categoriesState],
  );
  const activeAccounts = React.useMemo(
    () => accounts.filter((a) => !a.archived),
    [accounts],
  );

  const { create, update, remove, isSubmitting } = useTransactionMutations();

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingTx, setEditingTx] = React.useState<Transaction | null>(null);

  const handleCreate = async (values: TransactionInput) => {
    await create(values);
    setIsCreateOpen(false);
  };

  const handleUpdate = async (values: TransactionInput) => {
    if (!editingTx) return;
    await update(editingTx.id, editingTx, values);
    setEditingTx(null);
  };

  const dashboardSkeleton = (
    <div className="space-y-6">
      <LoadingSkeleton
        variant="card"
        count={4}
        className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LoadingSkeleton variant="chart" />
        <LoadingSkeleton variant="chart" />
      </div>
      <LoadingSkeleton variant="list" count={5} />
    </div>
  );

  return (
    <div data-testid="dashboard-page" className="space-y-6">
      {/* 1. Header with Month Navigator and Add Transaction Button */}
      <PageHeader
        title={t('dashboard.title')}
        description={t('dashboard.description')}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <MonthNavigator
              value={selectedMonth}
              onChange={handleMonthChange}
            />
            <Button
              onClick={() => setIsCreateOpen(true)}
              data-testid="add-transaction-button"
              className="hidden sm:inline-flex"
            >
              <Plus className="mr-2 size-4" />
              {t('dashboard.addTransaction')}
            </Button>
          </div>
        }
      />

      {/* 2. Main Dashboard Content inside QueryBoundary */}
      <QueryBoundary
        state={dashboardState}
        skeleton={dashboardSkeleton}
        empty={
          <EmptyState
            title={t('dashboard.recentTransactions.empty')}
            action={
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 size-4" />
                {t('dashboard.addTransaction')}
              </Button>
            }
          />
        }
      >
        {(data) => (
          <div className="space-y-6">
            {/* 2.1 KPI Grid */}
            <DashboardKpiGrid
              metrics={data.metrics}
              activeAccountsCount={activeAccounts.length}
              currency={profile?.baseCurrency}
            />

            {/* 2.2 Charts Section */}
            <DashboardCharts
              categoryExpenses={data.categoryExpenses}
              monthlyHistory={data.monthlyHistory}
              categories={categories}
              currency={profile?.baseCurrency}
            />

            {/* 2.3 Recent Transactions Card */}
            <RecentTransactionsCard
              transactions={data.recentTransactions}
              categories={categories}
              accounts={accounts}
              selectedMonth={selectedMonth}
              onAddTransaction={() => setIsCreateOpen(true)}
              onEditTransaction={(tx) => setEditingTx(tx)}
              onDeleteTransaction={(tx) => void remove(tx)}
            />
          </div>
        )}
      </QueryBoundary>

      {/* 3. Mobile Floating Action Button (FAB) */}
      <Button
        size="icon"
        className="fixed right-4 bottom-20 z-30 size-14 rounded-full shadow-lg lg:hidden"
        onClick={() => setIsCreateOpen(true)}
        aria-label={t('dashboard.addTransaction')}
        data-testid="mobile-add-fab"
      >
        <Plus className="size-6" />
      </Button>

      {/* 4. Create Transaction Dialog */}
      <ResponsiveDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title={t('transactions.form.createTitle')}
      >
        <TransactionForm
          categories={categories}
          accounts={accounts}
          onSubmit={handleCreate}
          onCancel={() => setIsCreateOpen(false)}
          isSubmitting={isSubmitting}
        />
      </ResponsiveDialog>

      {/* 5. Edit Transaction Dialog */}
      <ResponsiveDialog
        open={!!editingTx}
        onOpenChange={(open) => !open && setEditingTx(null)}
        title={t('transactions.form.editTitle')}
      >
        {editingTx && (
          <TransactionForm
            initialData={editingTx}
            categories={categories}
            accounts={accounts}
            onSubmit={handleUpdate}
            onCancel={() => setEditingTx(null)}
            isSubmitting={isSubmitting}
          />
        )}
      </ResponsiveDialog>
    </div>
  );
}
