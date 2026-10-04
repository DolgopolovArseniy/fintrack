import * as React from 'react';
import { Plus } from 'lucide-react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/QueryBoundary';
import { ResponsiveDialog } from '@/components/common/ResponsiveDialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CategoryForm,
  CategoryList,
  useCategories,
  useCategoryMutations,
  type Category,
  type CategoryInput,
} from '@/features/categories';
import { useTranslation } from '@/lib/i18n';

export function CategoriesPage() {
  const { t } = useTranslation();
  const categoriesState = useCategories();
  const {
    createCategory,
    updateCategory,
    archiveCategory,
    unarchiveCategory,
    isSubmitting,
  } = useCategoryMutations();

  const [activeTab, setActiveTab] = React.useState<'expense' | 'income'>(
    'expense',
  );
  const [showArchived, setShowArchived] = React.useState(false);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(
    null,
  );
  const [categoryToArchive, setCategoryToArchive] =
    React.useState<Category | null>(null);

  const existingCategories =
    categoriesState.status === 'success' ? categoriesState.data : [];

  const handleCreate = async (values: CategoryInput) => {
    await createCategory(values);
    setIsCreateOpen(false);
  };

  const handleUpdate = async (values: CategoryInput) => {
    if (!editingCategory) return;
    await updateCategory(editingCategory.id, {
      name: values.name,
      icon: values.icon,
      color: values.color,
    });
    setEditingCategory(null);
  };

  const handleConfirmArchive = async () => {
    if (!categoryToArchive) return;
    await archiveCategory(categoryToArchive.id);
    setCategoryToArchive(null);
  };

  return (
    <div data-testid="categories-page" className="space-y-6">
      <PageHeader
        title={t('categories.title')}
        description={t('categories.description')}
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="show-archived"
                checked={showArchived}
                onCheckedChange={setShowArchived}
                data-testid="show-archived-switch"
              />
              <Label
                htmlFor="show-archived"
                className="text-muted-foreground hover:text-foreground cursor-pointer text-sm font-normal"
              >
                {t('categories.showArchived')}
              </Label>
            </div>
            <Button
              onClick={() => setIsCreateOpen(true)}
              data-testid="add-category-button"
            >
              <Plus className="mr-2 size-4" />
              {t('categories.actions.add')}
            </Button>
          </div>
        }
      />

      <QueryBoundary
        state={categoriesState}
        empty={
          <EmptyState
            title={
              activeTab === 'expense'
                ? t('categories.empty.expenses')
                : t('categories.empty.incomes')
            }
            action={
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 size-4" />
                {t('categories.actions.add')}
              </Button>
            }
          />
        }
      >
        {(categories) => {
          const expenseCategories = categories.filter(
            (cat) => cat.type === 'expense' && (showArchived || !cat.archived),
          );
          const incomeCategories = categories.filter(
            (cat) => cat.type === 'income' && (showArchived || !cat.archived),
          );

          const activeExpenseCount = categories.filter(
            (cat) => cat.type === 'expense' && !cat.archived,
          ).length;
          const activeIncomeCount = categories.filter(
            (cat) => cat.type === 'income' && !cat.archived,
          ).length;

          return (
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as 'expense' | 'income')}
              className="w-full space-y-6"
              data-testid="categories-tabs"
            >
              <TabsList className="grid w-full grid-cols-2 sm:w-80">
                <TabsTrigger value="expense" data-testid="expense-tab">
                  <span>{t('categories.tabs.expenses')}</span>
                  <span className="bg-muted-foreground/20 ml-2 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums">
                    {activeExpenseCount}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="income" data-testid="income-tab">
                  <span>{t('categories.tabs.incomes')}</span>
                  <span className="bg-muted-foreground/20 ml-2 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums">
                    {activeIncomeCount}
                  </span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="expense" className="space-y-4">
                <CategoryList
                  categories={expenseCategories}
                  onEdit={(cat) => setEditingCategory(cat)}
                  onArchive={(cat) => setCategoryToArchive(cat)}
                  onUnarchive={(cat) => void unarchiveCategory(cat.id)}
                  emptyState={
                    <EmptyState
                      title={t('categories.empty.expenses')}
                      action={
                        <Button onClick={() => setIsCreateOpen(true)}>
                          <Plus className="mr-2 size-4" />
                          {t('categories.actions.add')}
                        </Button>
                      }
                    />
                  }
                />
              </TabsContent>

              <TabsContent value="income" className="space-y-4">
                <CategoryList
                  categories={incomeCategories}
                  onEdit={(cat) => setEditingCategory(cat)}
                  onArchive={(cat) => setCategoryToArchive(cat)}
                  onUnarchive={(cat) => void unarchiveCategory(cat.id)}
                  emptyState={
                    <EmptyState
                      title={t('categories.empty.incomes')}
                      action={
                        <Button onClick={() => setIsCreateOpen(true)}>
                          <Plus className="mr-2 size-4" />
                          {t('categories.actions.add')}
                        </Button>
                      }
                    />
                  }
                />
              </TabsContent>
            </Tabs>
          );
        }}
      </QueryBoundary>

      {/* Create Dialog */}
      <ResponsiveDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title={t('categories.form.createTitle')}
      >
        <CategoryForm
          defaultType={activeTab}
          existingCategories={existingCategories}
          onSubmit={handleCreate}
          onCancel={() => setIsCreateOpen(false)}
          isSubmitting={isSubmitting}
        />
      </ResponsiveDialog>

      {/* Edit Dialog */}
      <ResponsiveDialog
        open={!!editingCategory}
        onOpenChange={(open) => !open && setEditingCategory(null)}
        title={t('categories.form.editTitle')}
      >
        {editingCategory && (
          <CategoryForm
            initialData={editingCategory}
            existingCategories={existingCategories}
            onSubmit={handleUpdate}
            onCancel={() => setEditingCategory(null)}
            isSubmitting={isSubmitting}
          />
        )}
      </ResponsiveDialog>

      {/* Archive Confirm Dialog */}
      <ConfirmDialog
        open={!!categoryToArchive}
        onOpenChange={(open) => !open && setCategoryToArchive(null)}
        title={t('categories.dialog.archiveTitle')}
        description={t('categories.dialog.archiveDescription')}
        confirmLabel={t('categories.dialog.archiveConfirm')}
        variant="destructive"
        isLoading={isSubmitting}
        onConfirm={handleConfirmArchive}
      />
    </div>
  );
}
