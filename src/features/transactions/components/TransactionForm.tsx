import * as React from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { AmountInput } from '@/components/common/AmountInput';
import { CategoryBadge } from '@/components/common/CategoryBadge';
import { AccountBadge } from '@/components/common/AccountBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { sortAccounts, type Account } from '@/features/accounts';
import { sortCategories, type Category } from '@/features/categories';
import { cn } from '@/lib/cn';
import { DEFAULT_CURRENCY, type CurrencyCode } from '@/lib/currencies';
import { todayIso } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n';
import { NOTE_MAX_LENGTH } from '@/lib/limits';
import { isoDateSchema, moneyAmountSchema } from '@/lib/schemas';
import { translateValidationMessage } from '@/lib/validation';
import type { Transaction, TransactionInput } from '../schemas';

export interface TransactionFormProps {
  initialData?: Transaction;
  defaultType?: 'expense' | 'income';
  categories?: Category[];
  accounts?: Account[];
  currency?: CurrencyCode;
  onSubmit: (values: TransactionInput) => Promise<void> | void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  className?: string;
}

interface FormValues {
  type: 'expense' | 'income';
  amount: number;
  categoryId: string;
  accountId: string;
  date: string;
  note?: string;
}

export function TransactionForm({
  initialData,
  defaultType = 'expense',
  categories = [],
  accounts = [],
  currency = DEFAULT_CURRENCY,
  onSubmit,
  onCancel,
  isSubmitting = false,
  className,
}: TransactionFormProps) {
  const { t } = useTranslation();

  const translate = React.useCallback(
    (key: string, options?: Record<string, unknown>) => {
      const defaultValue =
        typeof options?.defaultValue === 'string' ? options.defaultValue : key;
      return t(key as never, { defaultValue, ...options });
    },
    [t],
  );

  const formSchema = React.useMemo(() => {
    return z.object({
      type: z.enum(['expense', 'income']),
      amount: moneyAmountSchema,
      categoryId: z
        .string({ error: 'validation.required' })
        .min(1, { error: 'validation.required' }),
      accountId: z
        .string({ error: 'validation.required' })
        .min(1, { error: 'validation.required' }),
      date: isoDateSchema,
      note: z
        .string()
        .max(NOTE_MAX_LENGTH, { error: 'validation.tooLong' })
        .optional(),
    });
  }, []);

  const defaultAccountId = React.useMemo(() => {
    if (initialData?.accountId) return initialData.accountId;
    const mainAccount = accounts.find(
      (acc) => acc.systemKey === 'main' && !acc.archived,
    );
    if (mainAccount) return mainAccount.id;
    const firstActive = accounts.find((acc) => !acc.archived);
    return firstActive?.id ?? accounts[0]?.id ?? '';
  }, [initialData, accounts]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: initialData?.type ?? defaultType,
      amount: initialData?.amount ?? 0,
      categoryId: initialData?.categoryId ?? '',
      accountId: initialData?.accountId ?? defaultAccountId,
      date: initialData?.date ?? todayIso(),
      note: initialData?.note ?? '',
    },
    mode: 'onTouched',
  });

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form;

  const currentType = useWatch({ control, name: 'type' });
  const currentCategoryId = useWatch({ control, name: 'categoryId' });
  const currentNote = useWatch({ control, name: 'note' }) || '';

  // Update accountId if accounts loaded asynchronously and none was selected
  React.useEffect(() => {
    const currentAcc = form.getValues('accountId');
    if (!currentAcc && defaultAccountId) {
      setValue('accountId', defaultAccountId, { shouldValidate: true });
    }
  }, [defaultAccountId, form, setValue]);

  // When type changes, ensure category matches current type
  const handleTypeChange = (newType: 'expense' | 'income') => {
    setValue('type', newType, { shouldValidate: true });
    const selectedCat = categories.find((c) => c.id === currentCategoryId);
    if (selectedCat && selectedCat.type !== newType) {
      setValue('categoryId', '', { shouldValidate: true });
    }
  };

  // Filter categories matching current type, sorted deterministically
  const filteredCategories = React.useMemo(() => {
    const list = categories.filter((cat) => {
      if (cat.type !== currentType) return false;
      // Allow current category even if archived
      if (cat.id === initialData?.categoryId) return true;
      return !cat.archived;
    });
    return sortCategories(list, translate);
  }, [categories, currentType, initialData, translate]);

  // Filter accounts
  const filteredAccounts = React.useMemo(() => {
    const list = accounts.filter((acc) => {
      if (acc.id === initialData?.accountId) return true;
      return !acc.archived;
    });
    return sortAccounts(list, translate);
  }, [accounts, initialData, translate]);

  const onFormSubmit = async (values: FormValues) => {
    const trimmedNote = values.note?.trim();
    const payload: TransactionInput = {
      type: values.type,
      amount: values.amount,
      categoryId: values.categoryId,
      accountId: values.accountId,
      date: values.date,
      ...(trimmedNote && trimmedNote.length > 0 ? { note: trimmedNote } : {}),
    };
    await onSubmit(payload);
  };

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(onFormSubmit)(e);
      }}
      className={cn('space-y-4 sm:space-y-5', className)}
      data-testid="transaction-form"
      noValidate
    >
      {/* 1. Type Tabs */}
      <div className="space-y-1.5">
        <Label>{t('transactions.form.typeLabel')}</Label>
        <Tabs
          value={currentType}
          onValueChange={(val) => handleTypeChange(val as 'expense' | 'income')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expense" data-testid="transaction-type-expense">
              {t('transactions.summary.expense')}
            </TabsTrigger>
            <TabsTrigger value="income" data-testid="transaction-type-income">
              {t('transactions.summary.income')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 2. Amount Input */}
      <div className="space-y-1.5">
        <Label htmlFor="transaction-amount">
          {t('transactions.form.amountLabel')}
        </Label>
        <Controller
          name="amount"
          control={control}
          render={({ field }) => (
            <AmountInput
              id="transaction-amount"
              value={field.value}
              onChange={field.onChange}
              currency={currency}
              data-testid="transaction-amount-input"
              aria-invalid={!!errors.amount}
            />
          )}
        />
        {errors.amount && (
          <p
            className="text-destructive text-xs font-medium"
            role="alert"
            data-testid="amount-error"
          >
            {translateValidationMessage(t, errors.amount.message)}
          </p>
        )}
      </div>

      {/* 3. Category Select */}
      <div className="space-y-1.5">
        <Label htmlFor="transaction-category">
          {t('transactions.form.categoryLabel')}
        </Label>
        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger
                id="transaction-category"
                data-testid="transaction-category-select"
                className="w-full"
                aria-invalid={!!errors.categoryId}
              >
                <SelectValue
                  placeholder={t('transactions.form.selectCategory')}
                />
              </SelectTrigger>
              <SelectContent position="popper">
                {filteredCategories.map((cat) => {
                  const isArchived = cat.archived;
                  return (
                    <SelectItem
                      key={cat.id}
                      value={cat.id}
                      data-testid={`category-option-${cat.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <CategoryBadge
                          name={cat.name}
                          systemKey={cat.systemKey}
                          icon={cat.icon}
                          color={cat.color}
                          archived={isArchived}
                          size="sm"
                          showArchivedBadge={false}
                        />
                        {isArchived && (
                          <span className="text-muted-foreground text-xs italic">
                            {t('transactions.form.archivedSuffix')}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        />
        {errors.categoryId && (
          <p
            className="text-destructive text-xs font-medium"
            role="alert"
            data-testid="category-error"
          >
            {translateValidationMessage(t, errors.categoryId.message)}
          </p>
        )}
      </div>

      {/* 4. Account Select */}
      <div className="space-y-1.5">
        <Label htmlFor="transaction-account">
          {t('transactions.form.accountLabel')}
        </Label>
        <Controller
          name="accountId"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger
                id="transaction-account"
                data-testid="transaction-account-select"
                className="w-full"
                aria-invalid={!!errors.accountId}
              >
                <SelectValue
                  placeholder={t('transactions.form.selectAccount')}
                />
              </SelectTrigger>
              <SelectContent position="popper">
                {filteredAccounts.map((acc) => {
                  const isArchived = acc.archived;
                  return (
                    <SelectItem
                      key={acc.id}
                      value={acc.id}
                      data-testid={`account-option-${acc.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <AccountBadge
                          name={acc.name}
                          systemKey={acc.systemKey}
                          type={acc.type}
                          archived={isArchived}
                          size="sm"
                          showArchivedBadge={false}
                        />
                        {isArchived && (
                          <span className="text-muted-foreground text-xs italic">
                            {t('transactions.form.archivedSuffix')}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        />
        {errors.accountId && (
          <p
            className="text-destructive text-xs font-medium"
            role="alert"
            data-testid="account-error"
          >
            {translateValidationMessage(t, errors.accountId.message)}
          </p>
        )}
      </div>

      {/* 5. Date Picker */}
      <div className="space-y-1.5">
        <Label htmlFor="transaction-date">
          {t('transactions.form.dateLabel')}
        </Label>
        <Controller
          name="date"
          control={control}
          render={({ field }) => (
            <Input
              id="transaction-date"
              type="date"
              value={field.value}
              onChange={field.onChange}
              data-testid="transaction-date-input"
              aria-invalid={!!errors.date}
            />
          )}
        />
        {errors.date && (
          <p
            className="text-destructive text-xs font-medium"
            role="alert"
            data-testid="date-error"
          >
            {translateValidationMessage(t, errors.date.message)}
          </p>
        )}
      </div>

      {/* 6. Note */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="transaction-note">
            {t('transactions.form.noteLabel')}
          </Label>
          <span
            className="text-muted-foreground text-xs tabular-nums"
            data-testid="note-counter"
          >
            {currentNote.length}/{NOTE_MAX_LENGTH}
          </span>
        </div>
        <Controller
          name="note"
          control={control}
          render={({ field }) => (
            <Input
              id="transaction-note"
              type="text"
              maxLength={NOTE_MAX_LENGTH}
              placeholder={t('transactions.form.notePlaceholder')}
              value={field.value ?? ''}
              onChange={field.onChange}
              data-testid="transaction-note-input"
              aria-invalid={!!errors.note}
            />
          )}
        />
        {errors.note && (
          <p
            className="text-destructive text-xs font-medium"
            role="alert"
            data-testid="note-error"
          >
            {translateValidationMessage(t, errors.note.message)}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            data-testid="transaction-cancel-button"
          >
            {t('common.actions.cancel')}
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          data-testid="transaction-submit-button"
        >
          {isSubmitting && (
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
          )}
          {t('common.actions.save')}
        </Button>
      </div>
    </form>
  );
}
