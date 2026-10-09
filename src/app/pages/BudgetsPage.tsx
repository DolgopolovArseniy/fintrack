import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Copy, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { MonthNavigator } from '@/components/common/MonthNavigator';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import {
  BudgetForm,
  BudgetList,
  BudgetSummaryHeader,
  CopyBudgetsDialog,
  UnbudgetedCategoriesSection,
  useBudgetMutations,
  useBudgetSummary,
  type BudgetInput,
  type BudgetUpdateInput,
  type EnrichedBudget,
} from '@/features/budgets';
import {
  getCategoryDisplayName,
  useCategories,
  type Category,
} from '@/features/categories';
import type { SubscriptionResult } from '@/hooks/useSubscription';
import {
  addMonths,
  currentYearMonth,
  formatYearMonth,
  isValidYearMonth,
  type YearMonth,
} from '@/lib/dates';
import { DEFAULT_LOCALE, type Locale } from '@/lib/locales';
import { useTranslation } from '@/lib/i18n';

export function BudgetsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const monthParam = searchParams.get('month');
  const month: YearMonth = isValidYearMonth(monthParam ?? '')
    ? (monthParam as YearMonth)
    : currentYearMonth();

  const prevMonth = React.useMemo(() => addMonths(month, -1), [month]);

  const currentLocale: Locale = i18n.language?.startsWith('ru')
    ? 'ru'
    : DEFAULT_LOCALE;

  const formattedPreviousMonth = React.useMemo(
    () => formatYearMonth(prevMonth, currentLocale),
    [prevMonth, currentLocale],
  );

  const categoriesState = useCategories();
  const categories = React.useMemo(() => {
    return categoriesState.status === 'success' ? categoriesState.data : [];
  }, [categoriesState]);

  const summaryState = useBudgetSummary(month);
  const {
    enrichedBudgets,
    summaryTotals,
    unbudgetedCategories,
    previousMonthBudgetsCount,
    isLoading,
    error,
  } = summaryState;

  const {
    createBudget,
    updateBudget,
    deleteBudget,
    copyBudgets,
    isSubmitting,
    isCopying,
  } = useBudgetMutations();

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [selectedCategoryIdForCreate, setSelectedCategoryIdForCreate] =
    React.useState<string | undefined>();
  const [editingBudget, setEditingBudget] =
    React.useState<EnrichedBudget | null>(null);
  const [deletingBudget, setDeletingBudget] =
    React.useState<EnrichedBudget | null>(null);
  const [isCopyOpen, setIsCopyOpen] = React.useState(false);

  const handleMonthChange = (newMonth: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('month', newMonth);
      return next;
    });
  };

  const handleCreate = async (values: BudgetInput | BudgetUpdateInput) => {
    await createBudget(values as BudgetInput);
    setIsCreateOpen(false);
    setSelectedCategoryIdForCreate(undefined);
  };

  const handleUpdate = async (values: BudgetInput | BudgetUpdateInput) => {
    if (!editingBudget) return;
    await updateBudget(editingBudget.id, { limit: values.limit });
    setEditingBudget(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingBudget) return;
    await deleteBudget(deletingBudget.id);
    setDeletingBudget(null);
  };

  const handleCopyConfirm = async ({ overwrite }: { overwrite: boolean }) => {
    await copyBudgets(prevMonth, month, { overwrite });
    setIsCopyOpen(false);
  };

  const handleViewTransactions = (budget: EnrichedBudget) => {
    void navigate(
      `/app/transactions?month=${month}&categoryId=${budget.categoryId}`,
    );
  };

  const handleSetLimitForCategory = (category: Category) => {
    setSelectedCategoryIdForCreate(category.id);
    setIsCreateOpen(true);
  };

  const deletingCategory = React.useMemo(() => {
    if (!deletingBudget) return null;
    return categories.find((c) => c.id === deletingBudget.categoryId);
  }, [deletingBudget, categories]);

  const deletingCategoryName = deletingCategory
    ? getCategoryDisplayName(deletingCategory, (k, o) => t(k as never, o))
    : (deletingBudget?.categoryId ?? '');

  const queryState: SubscriptionResult<EnrichedBudget[]> = React.useMemo(() => {
    if (isLoading) {
      return { status: 'loading', retry: () => {} };
    }
    if (error) {
      return { status: 'error', error, retry: () => {} };
    }
    return {
      status: 'success',
      data: enrichedBudgets,
      retry: () => {},
    };
  }, [isLoading, error, enrichedBudgets]);

  return (
    <div data-testid="budgets-page" className="space-y-6">
      {/* 1. Header with MonthNavigator and Action Buttons */}
      <PageHeader
        title={t('budgets.title')}
        description={t('budgets.description')}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <MonthNavigator value={month} onChange={handleMonthChange} />
            {previousMonthBudgetsCount > 0 && (
              <Button
                variant="outline"
                onClick={() => setIsCopyOpen(true)}
                data-testid="copy-budgets-button"
                className="hidden sm:inline-flex"
              >
                <Copy className="mr-2 size-4" />
                {t('budgets.actions.copyFromPrevious')}
              </Button>
            )}
            <Button
              onClick={() => {
                setSelectedCategoryIdForCreate(undefined);
                setIsCreateOpen(true);
              }}
              data-testid="add-budget-button"
              className="hidden sm:inline-flex"
            >
              <Plus className="mr-2 size-4" />
              {t('budgets.actions.add')}
            </Button>
          </div>
        }
      />

      {/* 2. Main content with QueryBoundary */}
      <QueryBoundary
        state={queryState}
        empty={
          <div className="space-y-6">
            {previousMonthBudgetsCount > 0 && (
              <Card
                data-testid="copy-budgets-banner"
                className="border-primary/20 bg-primary/5 p-5 shadow-xs"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-foreground text-sm font-medium">
                    {t('budgets.copyBanner.message', {
                      count: previousMonthBudgetsCount,
                      previousMonth: formattedPreviousMonth,
                    })}
                  </p>
                  <Button
                    onClick={() => setIsCopyOpen(true)}
                    data-testid="copy-banner-action"
                    className="shrink-0"
                  >
                    <Copy className="mr-2 size-4" />
                    {t('budgets.copyBanner.action')}
                  </Button>
                </div>
              </Card>
            )}

            <EmptyState
              title={t('budgets.empty.title')}
              description={t('budgets.empty.description')}
              action={
                <Button
                  onClick={() => {
                    setSelectedCategoryIdForCreate(undefined);
                    setIsCreateOpen(true);
                  }}
                  data-testid="empty-add-budget-button"
                >
                  <Plus className="mr-2 size-4" />
                  {t('budgets.empty.action')}
                </Button>
              }
            />

            {unbudgetedCategories.length > 0 && (
              <UnbudgetedCategoriesSection
                categories={unbudgetedCategories}
                onSetLimit={handleSetLimitForCategory}
              />
            )}
          </div>
        }
      >
        {() => (
          <div className="space-y-6">
            <BudgetSummaryHeader summaryTotals={summaryTotals} />
            <BudgetList
              budgets={enrichedBudgets}
              categories={categories}
              onEdit={(b) => setEditingBudget(b)}
              onDelete={(b) => setDeletingBudget(b)}
              onViewTransactions={handleViewTransactions}
            />
            {unbudgetedCategories.length > 0 && (
              <UnbudgetedCategoriesSection
                categories={unbudgetedCategories}
                onSetLimit={handleSetLimitForCategory}
              />
            )}
          </div>
        )}
      </QueryBoundary>

      {/* 3. Mobile Floating Action Button (FAB) */}
      <Button
        size="icon"
        className="fixed right-4 bottom-20 z-30 size-14 rounded-full shadow-lg lg:hidden"
        onClick={() => {
          setSelectedCategoryIdForCreate(undefined);
          setIsCreateOpen(true);
        }}
        aria-label={t('budgets.actions.add')}
        data-testid="mobile-add-budget-fab"
      >
        <Plus className="size-6" />
      </Button>

      {/* 4. Create Budget Dialog */}
      <BudgetForm
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) setSelectedCategoryIdForCreate(undefined);
        }}
        month={month}
        defaultCategoryId={selectedCategoryIdForCreate}
        categories={categories}
        existingBudgets={enrichedBudgets}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />

      {/* 5. Edit Budget Dialog */}
      {editingBudget && (
        <BudgetForm
          open={!!editingBudget}
          onOpenChange={(open) => !open && setEditingBudget(null)}
          month={month}
          initialData={editingBudget}
          categories={categories}
          existingBudgets={enrichedBudgets}
          onSubmit={handleUpdate}
          isSubmitting={isSubmitting}
        />
      )}

      {/* 6. Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deletingBudget}
        onOpenChange={(open) => !open && setDeletingBudget(null)}
        title={t('budgets.confirm.deleteTitle')}
        description={t('budgets.confirm.deleteDescription', {
          category: deletingCategoryName,
        })}
        confirmLabel={t('budgets.confirm.deleteConfirm')}
        variant="destructive"
        isLoading={isSubmitting}
        onConfirm={handleDeleteConfirm}
      />

      {/* 7. Copy Budgets Dialog */}
      <CopyBudgetsDialog
        open={isCopyOpen}
        onOpenChange={setIsCopyOpen}
        sourceMonth={prevMonth}
        targetMonth={month}
        sourceBudgetsCount={previousMonthBudgetsCount}
        isCopying={isCopying}
        onConfirm={handleCopyConfirm}
      />
    </div>
  );
}
