import * as React from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NAME_MAX_LENGTH } from '@/lib/limits';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import {
  categoryColorSchema,
  type Category,
  type CategoryInput,
} from '../schemas';
import type { CategoryColorKey } from '../constants';
import { ColorPicker } from './ColorPicker';
import { IconPicker } from './IconPicker';

export interface CategoryFormProps {
  initialData?: Category;
  defaultType?: 'expense' | 'income';
  onSubmit: (values: CategoryInput) => Promise<void> | void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  existingCategories?: Category[];
  className?: string;
}

interface FormValues {
  type: 'expense' | 'income';
  name: string;
  icon: string;
  color: CategoryColorKey;
}

export function CategoryForm({
  initialData,
  defaultType = 'expense',
  onSubmit,
  onCancel,
  isSubmitting = false,
  existingCategories = [],
  className,
}: CategoryFormProps) {
  const { t } = useTranslation();
  const isEditMode = !!initialData;

  const formSchema = React.useMemo(() => {
    return z
      .object({
        type: z.enum(['expense', 'income']),
        name: z.string().max(NAME_MAX_LENGTH, {
          message: t('validation.tooLong', { count: NAME_MAX_LENGTH }),
        }),
        icon: z.string().min(1, { message: t('validation.required') }),
        color: categoryColorSchema,
      })
      .superRefine((data, ctx) => {
        const trimmedName = data.name.trim();

        // New categories must have a name
        if (!initialData?.systemKey && trimmedName.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t('validation.required'),
            path: ['name'],
          });
          return;
        }

        // Duplicate name validation within same type (case-insensitive)
        if (trimmedName.length > 0) {
          const isDuplicate = existingCategories.some((cat) => {
            if (cat.id === initialData?.id) {
              return false;
            }
            if (cat.type !== data.type) {
              return false;
            }
            const catName = (
              cat.name?.trim() ||
              (cat.systemKey
                ? t(`categories.system.${cat.systemKey}` as const, {
                    defaultValue: cat.systemKey,
                  })
                : '')
            ).toLowerCase();
            return catName === trimmedName.toLowerCase();
          });

          if (isDuplicate) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('categories.validation.duplicateName'),
              path: ['name'],
            });
          }
        }
      });
  }, [t, initialData, existingCategories]);

  const defaultValues: FormValues = React.useMemo(() => {
    if (initialData) {
      return {
        type: initialData.type,
        name: initialData.name ?? '',
        icon: initialData.icon,
        color: initialData.color,
      };
    }
    return {
      type: defaultType,
      name: '',
      icon: defaultType === 'expense' ? 'utensils' : 'wallet',
      color: defaultType === 'expense' ? 'orange' : 'emerald',
    };
  }, [initialData, defaultType]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const currentType = useWatch({ control, name: 'type' });

  const onFormSubmit = async (values: FormValues) => {
    const payload: CategoryInput = {
      type: values.type,
      icon: values.icon.trim(),
      color: values.color,
      archived: initialData?.archived ?? false,
    };

    if (values.name.trim().length > 0) {
      payload.name = values.name.trim();
    }
    if (initialData?.systemKey) {
      payload.systemKey = initialData.systemKey;
    }

    await onSubmit(payload);
  };

  const namePlaceholder = initialData?.systemKey
    ? t(`categories.system.${initialData.systemKey}` as const, {
        defaultValue: initialData.systemKey,
      })
    : t('categories.form.namePlaceholder');

  return (
    <form
      data-testid="category-form"
      onSubmit={(e) => void handleSubmit(onFormSubmit)(e)}
      className={cn('space-y-5', className)}
    >
      {/* Type selection */}
      <div className="space-y-2">
        <Label htmlFor="category-type-group">{t('categories.form.type')}</Label>
        <div id="category-type-group" className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={currentType === 'expense' ? 'default' : 'outline'}
            disabled={isEditMode || isSubmitting}
            onClick={() => setValue('type', 'expense')}
            className={cn(
              currentType === 'expense' &&
                'bg-expense text-expense-foreground hover:bg-expense/90',
            )}
          >
            {t('categories.tabs.expenses')}
          </Button>
          <Button
            type="button"
            variant={currentType === 'income' ? 'default' : 'outline'}
            disabled={isEditMode || isSubmitting}
            onClick={() => setValue('type', 'income')}
            className={cn(
              currentType === 'income' &&
                'bg-income text-income-foreground hover:bg-income/90',
            )}
          >
            {t('categories.tabs.incomes')}
          </Button>
        </div>
        {isEditMode && (
          <p className="text-muted-foreground text-xs">
            {t('categories.form.typeLocked')}
          </p>
        )}
      </div>

      {/* Name input */}
      <div className="space-y-2">
        <Label htmlFor="category-name-input">{t('categories.form.name')}</Label>
        <Input
          id="category-name-input"
          {...register('name')}
          placeholder={namePlaceholder}
          disabled={isSubmitting}
          aria-invalid={!!errors.name}
          maxLength={NAME_MAX_LENGTH}
        />
        {errors.name && (
          <p
            data-testid="category-name-error"
            className="text-destructive text-xs"
          >
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Icon picker */}
      <div className="space-y-2">
        <Label>{t('categories.form.icon')}</Label>
        <Controller
          control={control}
          name="icon"
          render={({ field }) => (
            <IconPicker
              value={field.value}
              onChange={field.onChange}
              disabled={isSubmitting}
            />
          )}
        />
        {errors.icon && (
          <p className="text-destructive text-xs">{errors.icon.message}</p>
        )}
      </div>

      {/* Color picker */}
      <div className="space-y-2">
        <Label>{t('categories.form.color')}</Label>
        <Controller
          control={control}
          name="color"
          render={({ field }) => (
            <ColorPicker
              value={field.value}
              onChange={field.onChange}
              disabled={isSubmitting}
            />
          )}
        />
        {errors.color && (
          <p className="text-destructive text-xs">{errors.color.message}</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2 pt-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            {t('common.actions.cancel')}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          )}
          {t('common.actions.save')}
        </Button>
      </div>
    </form>
  );
}
