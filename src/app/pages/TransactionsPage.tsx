import * as React from 'react';
import { Plus } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { MonthNavigator } from '@/components/common/MonthNavigator';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { ResponsiveDialog } from '@/components/common/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { useAccounts } from '@/features/accounts';
import { useCategories } from '@/features/categories';
import {
  TransactionFilters,
  TransactionForm,
  TransactionList,
  TransactionSummaryBar,
  useGroupedTransactions,
  useTransactionFilters,
  useTransactionMutations,
  useTransactions,
  type Transaction,
  type TransactionInput,
} from '@/features/transactions';
import { useTranslation } from '@/lib/i18n';

export function TransactionsPage() {
  const { t } = useTranslation();

  const {
    filters,
    setMonth,
    setType,
    setCategory,
    setAccount,
    setSearch,
    resetFilters,
    hasActiveFilters,
  } = useTransactionFilters();

  const transactionsState = useTransactions(filters.month);
  const categoriesState = useCategories();
  const accountsState = useAccounts();

  const { create, update, remove, isSubmitting } = useTransactionMutations();

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingTx, setEditingTx] = React.useState<Transaction | null>(null);

  const transactions =
    transactionsState.status === 'success' ? transactionsState.data : [];
  const categories =
    categoriesState.status === 'success' ? categoriesState.data : [];
  const accounts = accountsState.status === 'success' ? accountsState.data : [];

  const { groups, totalIncome, totalExpense, net, filteredCount } =
    useGroupedTransactions(transactions, filters);

  const handleCreate = async (values: TransactionInput) => {
    await create(values);
    setIsCreateOpen(false);
  };

  const handleUpdate = async (values: TransactionInput) => {
    if (!editingTx) return;
    await update(editingTx.id, editingTx, values);
    setEditingTx(null);
  };

  const handleDelete = (tx: Transaction) => {
    void remove(tx);
  };

  return (
    <div data-testid="transactions-page" className="space-y-6">
      {/* 1. Header with MonthNavigator and Add Button */}
      <PageHeader
        title={t('transactions.title')}
        description={t('transactions.description')}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <MonthNavigator value={filters.month} onChange={setMonth} />
            <Button
              onClick={() => setIsCreateOpen(true)}
              data-testid="add-transaction-button"
              className="hidden sm:inline-flex"
            >
              <Plus className="mr-2 size-4" />
              {t('transactions.actions.add')}
            </Button>
          </div>
        }
      />

      {/* 2. Monthly Summary Bar */}
      <TransactionSummaryBar
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        net={net}
      />

      {/* 3. Filters Toolbar */}
      <TransactionFilters
        filters={filters}
        onTypeChange={setType}
        onCategoryChange={setCategory}
        onAccountChange={setAccount}
        onSearchChange={setSearch}
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
        categories={categories}
        accounts={accounts}
      />

      {/* 4. Transactions Content with QueryBoundary */}
      <QueryBoundary
        state={transactionsState}
        empty={
          <EmptyState
            title={t('transactions.empty.monthTitle')}
            description={t('transactions.empty.monthDescription')}
            action={
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 size-4" />
                {t('transactions.actions.add')}
              </Button>
            }
          />
        }
      >
        {(loadedTransactions) => {
          if (loadedTransactions.length > 0 && filteredCount === 0) {
            return (
              <EmptyState
                title={t('transactions.empty.filteredTitle')}
                description={t('transactions.empty.filteredDescription')}
                action={
                  <Button variant="outline" onClick={resetFilters}>
                    {t('transactions.actions.resetFilters')}
                  </Button>
                }
              />
            );
          }

          return (
            <TransactionList
              groups={groups}
              categories={categories}
              accounts={accounts}
              onEdit={(tx) => setEditingTx(tx)}
              onDelete={handleDelete}
            />
          );
        }}
      </QueryBoundary>

      {/* 5. Mobile Floating Action Button (FAB) */}
      <Button
        size="icon"
        className="fixed right-4 bottom-20 z-30 size-14 rounded-full shadow-lg lg:hidden"
        onClick={() => setIsCreateOpen(true)}
        aria-label={t('transactions.actions.add')}
        data-testid="mobile-add-fab"
      >
        <Plus className="size-6" />
      </Button>

      {/* 6. Create Transaction Dialog */}
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

      {/* 7. Edit Transaction Dialog */}
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
