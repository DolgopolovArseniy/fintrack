import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Mail } from 'lucide-react';
import { Link } from 'react-router';
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
import { useTranslation } from '@/lib/i18n';
import { getAuthErrorKey } from '../authErrors';
import { sendPasswordReset } from '../authService';
import { resetPasswordSchema, type ResetPasswordInput } from '../formSchemas';
import { AuthFormCard } from './AuthFormCard';

export function ResetPasswordForm() {
  const { t } = useTranslation();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    try {
      setFormError(null);
      await sendPasswordReset(data.email);
      setIsSuccess(true);
    } catch (err) {
      // AC7: Always show same success state even for non-existent users (auth/user-not-found)
      const isUserNotFound =
        Boolean(err) &&
        typeof err === 'object' &&
        'code' in (err as { code?: unknown }) &&
        (err as { code?: unknown }).code === 'auth/user-not-found';

      if (isUserNotFound) {
        setIsSuccess(true);
        return;
      }

      const errorKey = getAuthErrorKey(err);
      if (errorKey) {
        setFormError(t(errorKey));
      }
    }
  };

  if (isSuccess) {
    return (
      <AuthFormCard
        title={t('auth.reset.successTitle')}
        description={t('auth.reset.successDescription')}
        footer={
          <Link
            to={ROUTES.login}
            className="text-primary text-sm font-medium hover:underline"
          >
            {t('auth.reset.backToLogin')}
          </Link>
        }
      >
        <div className="flex flex-col items-center justify-center space-y-4 py-4 text-center">
          <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
            <Mail className="size-6" aria-hidden="true" />
          </div>
          <p className="text-muted-foreground text-sm">
            {t('auth.reset.successDescription')}
          </p>
          <Button asChild className="w-full">
            <Link to={ROUTES.login}>{t('auth.reset.backToLogin')}</Link>
          </Button>
        </div>
      </AuthFormCard>
    );
  }

  return (
    <AuthFormCard
      title={t('auth.reset.title')}
      description={t('auth.reset.description')}
      footer={
        <Link
          to={ROUTES.login}
          className="text-primary text-sm font-medium hover:underline"
        >
          {t('auth.reset.backToLogin')}
        </Link>
      }
    >
      <Form {...form}>
        <form
          onSubmit={(e) => {
            void form.handleSubmit(onSubmit)(e);
          }}
          className="space-y-4"
        >
          <FormAlert message={formError} />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.fields.email')}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    disabled={form.formState.isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && (
              <Loader2
                className="mr-2 size-4 animate-spin"
                aria-hidden="true"
              />
            )}
            {t('auth.reset.submit')}
          </Button>
        </form>
      </Form>
    </AuthFormCard>
  );
}
