import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AmountInput } from '@/components/common/AmountInput';
import { CategoryBadge } from '@/components/common/CategoryBadge';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/common/ResponsiveDialog';
import { getCategoryDisplayName, type Category } from '@/features/categories';
import { moneyAmountSchema, yearMonthSchema } from '@/lib/schemas';
import { translateValidationMessage } from '@/lib/validation';
import { useTranslation } from '@/lib/i18n';
import type {
  Budget,
  BudgetInput,
  BudgetUpdateInput,
  EnrichedBudget,
} from '../schemas';

export interface BudgetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  initialData?: EnrichedBudget | Budget;
  defaultCategoryId?: string;
  categories: Category[];
  existingBudgets?: (EnrichedBudget | Budget)[];
  onSubmit: (values: BudgetInput | BudgetUpdateInput) => Promise<void> | void;
  isSubmitting?: boolean;
  isDesktop?: boolean;
}

interface FormValues {
  categoryId: string;
  month: string;
  limit: number;
}

export function BudgetForm({
  open,
  onOpenChange,
  month,
  initialData,
  defaultCategoryId,
  categories,
  existingBudgets = [],
  onSubmit,
  isSubmitting = false,
  isDesktop,
}: BudgetFormProps) {
  const { t } = useTranslation();
  const isEditMode = !!initialData;

  const formSchema = React.useMemo(() => {
    return z.object({
      categoryId: z
        .string({ error: 'validation.required' })
        .min(1, { error: 'validation.required' }),
      month: yearMonthSchema,
      limit: moneyAmountSchema,
    });
  }, []);

  const budgetedCategoryIds = React.useMemo(() => {
    return new Set(
      existingBudgets
        .filter((b) => b.id !== initialData?.id)
        .map((b) => b.categoryId),
    );
  }, [existingBudgets, initialData]);

  const availableCategories = React.useMemo(() => {
    return categories.filter(
      (cat) =>
        cat.type === 'expense' &&
        (!cat.archived || cat.id === initialData?.categoryId) &&
        (!budgetedCategoryIds.has(cat.id) ||
          cat.id === initialData?.categoryId),
    );
  }, [categories, budgetedCategoryIds, initialData]);

  const firstAvailableCategoryId = availableCategories[0]?.id || '';
  const initialDataId = initialData?.id;
  const initialLimit = initialData?.limit;
  const initialMonth = initialData?.month;
  const initialCatId = initialData?.categoryId;

  const defaultValues: FormValues = React.useMemo(() => {
    if (initialData) {
      return {
        categoryId: initialCatId ?? '',
        month: initialMonth ?? month,
        limit: initialLimit ?? 0,
      };
    }
    return {
      categoryId: defaultCategoryId ?? firstAvailableCategoryId,
      month,
      limit: 0,
    };
  }, [
    initialData,
    initialCatId,
    initialMonth,
    initialLimit,
    defaultCategoryId,
    firstAvailableCategoryId,
    month,
  ]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          categoryId: initialCatId ?? '',
          month: initialMonth ?? month,
          limit: initialLimit ?? 0,
        });
      } else {
        reset({
          categoryId: defaultCategoryId ?? firstAvailableCategoryId,
          month,
          limit: 0,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialDataId, initialLimit, defaultCategoryId, month, reset]);

  const selectedCategory = React.useMemo(() => {
    const catId = initialData?.categoryId ?? defaultCategoryId;
    return categories.find((c) => c.id === catId);
  }, [categories, initialData, defaultCategoryId]);

  const onFormSubmit = async (values: FormValues) => {
    if (isEditMode) {
      await onSubmit({ limit: values.limit });
    } else {
      await onSubmit({
        categoryId: values.categoryId,
        month: values.month,
        limit: values.limit,
      });
    }
    onOpenChange(false);
  };

  const currentCategoryName = selectedCategory
    ? getCategoryDisplayName(selectedCategory, (k, o) => t(k as never, o))
    : '';

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      isDesktop={isDesktop}
    >
      <ResponsiveDialogContent data-testid="budget-form-dialog">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {isEditMode
              ? t('budgets.form.editTitle')
              : t('budgets.form.createTitle')}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {isEditMode
              ? t('budgets.form.editDescription', {
                  category: currentCategoryName,
                })
              : t('budgets.form.createDescription')}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          data-testid="budget-form"
          onSubmit={(e) => void handleSubmit(onFormSubmit)(e)}
          className="space-y-4"
        >
          {/* Category selection */}
          <div className="space-y-2">
            <Label htmlFor="budget-category-select">
              {t('budgets.form.categoryLabel')}
            </Label>
            {isEditMode ? (
              <div className="pt-1">
                {selectedCategory ? (
                  <CategoryBadge
                    name={selectedCategory.name}
                    systemKey={selectedCategory.systemKey}
                    icon={selectedCategory.icon}
                    color={selectedCategory.color}
                    archived={selectedCategory.archived}
                  />
                ) : (
                  <span className="text-muted-foreground text-sm">
                    {initialData.categoryId}
                  </span>
                )}
              </div>
            ) : (
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger
                      id="budget-category-select"
                      data-testid="budget-category-select"
                      className="w-full"
                    >
                      <SelectValue
                        placeholder={t('budgets.form.categoryPlaceholder')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <CategoryBadge
                            name={category.name}
                            systemKey={category.systemKey}
                            icon={category.icon}
                            color={category.color}
                            size="sm"
                          />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
            {errors.categoryId && (
              <p
                data-testid="budget-category-error"
                className="text-destructive text-xs"
              >
                {translateValidationMessage(t, errors.categoryId.message)}
              </p>
            )}
          </div>

          {/* Limit input */}
          <div className="space-y-2">
            <Label htmlFor="budget-limit-input">
              {t('budgets.form.limitLabel')}
            </Label>
            <Controller
              control={control}
              name="limit"
              render={({ field }) => (
                <AmountInput
                  id="budget-limit-input"
                  data-testid="budget-limit-input"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.limit}
                />
              )}
            />
            <p className="text-muted-foreground text-xs">
              {t('budgets.form.limitHint')}
            </p>
            {errors.limit && (
              <p
                data-testid="budget-limit-error"
                className="text-destructive text-xs"
              >
                {translateValidationMessage(t, errors.limit.message)}
              </p>
            )}
          </div>

          <ResponsiveDialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              data-testid="budget-form-cancel"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('common.actions.cancel')}
            </Button>
            <Button
              type="submit"
              data-testid="budget-form-submit"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              )}
              {t('common.actions.save')}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
