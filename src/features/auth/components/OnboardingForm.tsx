import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ROUTES } from '@/app/routes';
import { FormAlert } from '@/components/common/FormAlert';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from '@/lib/currencies';
import { DEFAULT_LOCALE, isSupportedLocale } from '@/lib/locales';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { executeOnboardingBatch } from '../onboarding';
import { useAuth } from '../useAuth';
import { onboardingSchema, type OnboardingFormInput } from '../formSchemas';

export interface OnboardingFormProps {
  onSuccess?: () => void;
  className?: string;
}

export function OnboardingForm({ onSuccess, className }: OnboardingFormProps) {
  const { t, i18n } = useTranslation();
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm<OnboardingFormInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      baseCurrency: DEFAULT_CURRENCY,
      displayName: user?.displayName ?? '',
    },
  });

  React.useEffect(() => {
    if (user?.displayName && !form.getValues('displayName')) {
      form.setValue('displayName', user.displayName);
    }
  }, [user?.displayName, form]);

  const onSubmit = async (data: OnboardingFormInput) => {
    if (!user) {
      setFormError(t('categories.errors.unauthorized'));
      return;
    }

    setFormError(null);
    try {
      const locale = isSupportedLocale(i18n.language)
        ? i18n.language
        : DEFAULT_LOCALE;
      const trimmedName = data.displayName?.trim();

      await executeOnboardingBatch(user.uid, {
        baseCurrency: data.baseCurrency,
        locale,
        theme: 'system',
        displayName: trimmedName || (user.displayName ?? undefined),
      });

      await refreshProfile();

      if (onSuccess) {
        onSuccess();
      } else {
        void navigate(ROUTES.dashboard, { replace: true });
      }
    } catch {
      setFormError(t('categories.onboarding.failed'));
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        data-testid="onboarding-form"
        className={cn('space-y-4', className)}
        noValidate
      >
        <FormAlert message={formError} />

        <FormField
          control={form.control}
          name="baseCurrency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('categories.onboarding.currencyLabel')}</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger
                    className="w-full"
                    data-testid="onboarding-currency-select"
                  >
                    <SelectValue
                      placeholder={t(
                        'categories.onboarding.currencyPlaceholder',
                      )}
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('categories.onboarding.displayNameLabel')}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="text"
                  autoComplete="name"
                  placeholder={t(
                    'categories.onboarding.displayNamePlaceholder',
                  )}
                  disabled={isSubmitting}
                  data-testid="onboarding-display-name-input"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
          data-testid="onboarding-submit-button"
        >
          {isSubmitting && (
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
          )}
          {t('categories.onboarding.submit')}
        </Button>
      </form>
    </Form>
  );
}
