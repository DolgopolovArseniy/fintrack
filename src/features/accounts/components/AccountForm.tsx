import * as React from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Banknote, CreditCard, Landmark, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AmountInput } from '@/components/common/AmountInput';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/common/ResponsiveDialog';
import { NAME_MAX_LENGTH } from '@/lib/limits';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import type { CurrencyCode } from '@/lib/currencies';
import {
  accountBalanceSchema,
  accountTypeSchema,
  type Account,
  type AccountInput,
} from '../schemas';
import { ACCOUNT_TYPES, type AccountType } from '../constants';
import { getAccountTypeLabel } from '../utils';

export interface AccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Account;
  onSubmit: (values: AccountInput) => Promise<void> | void;
  isSubmitting?: boolean;
  currency?: CurrencyCode;
  isDesktop?: boolean;
}

interface FormValues {
  name: string;
  type: AccountType;
  initialBalance: number;
}

const TYPE_BUTTON_ICONS: Record<
  AccountType,
  React.ComponentType<{ className?: string }>
> = {
  cash: Banknote,
  card: CreditCard,
  bank: Landmark,
};

export function AccountForm({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isSubmitting = false,
  currency,
  isDesktop = true,
}: AccountFormProps): React.JSX.Element {
  const { t } = useTranslation();
  const isEditMode = Boolean(initialData);

  const formSchema = React.useMemo(() => {
    return z
      .object({
        type: accountTypeSchema,
        initialBalance: accountBalanceSchema,
        name: z.string().max(NAME_MAX_LENGTH, {
          message: t('validation.tooLong', {
            count: NAME_MAX_LENGTH,
            defaultValue: `Must be at most ${NAME_MAX_LENGTH} characters`,
          }),
        }),
      })
      .superRefine((data, ctx) => {
        const trimmedName = data.name.trim();
        // New accounts or custom accounts without systemKey must have a non-empty name
        if (!initialData?.systemKey && trimmedName.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t('validation.required', {
              defaultValue: 'Field is required',
            }),
            path: ['name'],
          });
        }
      });
  }, [t, initialData]);

  const defaultValues: FormValues = React.useMemo(() => {
    if (initialData) {
      return {
        name: initialData.name ?? '',
        type: initialData.type,
        initialBalance: initialData.initialBalance,
      };
    }
    return {
      name: '',
      type: 'card',
      initialBalance: 0,
    };
  }, [initialData]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Reset form when dialog opens/closes or initialData changes
  React.useEffect(() => {
    if (open) {
      reset(defaultValues);
    }
  }, [open, defaultValues, reset]);

  const currentType = useWatch({ control, name: 'type' });

  const onFormSubmit = async (values: FormValues) => {
    const payload: AccountInput = {
      type: values.type,
      initialBalance: values.initialBalance,
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

  const dialogTitle = isEditMode
    ? t('accounts.form.editTitle', { defaultValue: 'Edit account' })
    : t('accounts.form.createTitle', { defaultValue: 'Create account' });

  const dialogDescription = isEditMode
    ? t('accounts.form.editDescription', {
        defaultValue: 'Update account details and initial balance',
      })
    : t('accounts.form.createDescription', {
        defaultValue: 'Add a new account to track your finances',
      });

  const namePlaceholder = initialData?.systemKey
    ? t('accounts.system.main', { defaultValue: 'Main account' })
    : t('accounts.form.namePlaceholder', {
        defaultValue: 'e.g. Main card, Cash, Savings',
      });

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      isDesktop={isDesktop}
    >
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{dialogTitle}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {dialogDescription}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          data-testid="account-form"
          onSubmit={(e) => void handleSubmit(onFormSubmit)(e)}
          className="space-y-4 pt-2"
        >
          {/* Account Name */}
          <div className="space-y-2">
            <Label htmlFor="account-name-input">
              {t('accounts.form.nameLabel', { defaultValue: 'Account name' })}
            </Label>
            <Input
              id="account-name-input"
              {...register('name')}
              placeholder={namePlaceholder}
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.name)}
              maxLength={NAME_MAX_LENGTH}
              data-testid="account-name-input"
            />
            {errors.name && (
              <p
                data-testid="account-name-error"
                className="text-destructive text-xs"
              >
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Account Type */}
          <div className="space-y-2">
            <Label htmlFor="account-type-group">
              {t('accounts.form.typeLabel', { defaultValue: 'Account type' })}
            </Label>
            <div
              id="account-type-group"
              className="grid grid-cols-3 gap-2"
              role="radiogroup"
              aria-label={t('accounts.form.typeLabel', {
                defaultValue: 'Account type',
              })}
            >
              {ACCOUNT_TYPES.map((type) => {
                const Icon = TYPE_BUTTON_ICONS[type];
                const isSelected = currentType === type;
                return (
                  <Button
                    key={type}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() =>
                      setValue('type', type, { shouldValidate: true })
                    }
                    className={cn(
                      'flex h-auto flex-col items-center gap-1.5 px-2 py-2.5 text-xs font-medium',
                      isSelected &&
                        'bg-primary text-primary-foreground shadow-xs',
                    )}
                    data-testid={`account-type-${type}`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>
                      {getAccountTypeLabel(type, (key, options) =>
                        t(key as never, options),
                      )}
                    </span>
                  </Button>
                );
              })}
            </div>
            {errors.type && (
              <p className="text-destructive text-xs">{errors.type.message}</p>
            )}
          </div>

          {/* Initial Balance */}
          <div className="space-y-2">
            <Label htmlFor="account-initial-balance-input">
              {t('accounts.form.initialBalanceLabel', {
                defaultValue: 'Initial balance',
              })}
            </Label>
            <Controller
              control={control}
              name="initialBalance"
              render={({ field }) => (
                <AmountInput
                  id="account-initial-balance-input"
                  value={field.value}
                  onChange={field.onChange}
                  currency={currency}
                  disabled={isSubmitting}
                  data-testid="account-initial-balance-input"
                />
              )}
            />
            <p className="text-muted-foreground text-xs">
              {t('accounts.form.initialBalanceHint', {
                defaultValue: 'Account balance at the start of tracking',
              })}
            </p>
            {errors.initialBalance && (
              <p
                data-testid="account-initial-balance-error"
                className="text-destructive text-xs"
              >
                {errors.initialBalance.message}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              data-testid="account-form-cancel"
            >
              {t('common.actions.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              data-testid="account-form-submit"
            >
              {isSubmitting && (
                <Loader2
                  aria-hidden="true"
                  className="mr-2 size-4 animate-spin"
                />
              )}
              {t('common.actions.save', { defaultValue: 'Save' })}
            </Button>
          </div>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
