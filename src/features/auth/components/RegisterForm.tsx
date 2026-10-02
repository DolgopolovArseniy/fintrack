import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ROUTES } from '@/app/routes';
import { FormAlert } from '@/components/common/FormAlert';
import { PasswordInput } from '@/components/common/PasswordInput';
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
import { registerWithEmail, signInWithGoogle } from '../authService';
import { registerSchema, type RegisterInput } from '../formSchemas';
import { resolveReturnTo, RETURN_TO_PARAM } from '../returnTo';
import { AuthFormCard } from './AuthFormCard';
import { GoogleButton } from './GoogleButton';

export function RegisterForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  const returnToQuery = searchParams.get(RETURN_TO_PARAM);
  const loginTo = returnToQuery
    ? `${ROUTES.login}?${RETURN_TO_PARAM}=${encodeURIComponent(returnToQuery)}`
    : ROUTES.login;

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    try {
      setFormError(null);
      await registerWithEmail({
        email: data.email,
        password: data.password,
        displayName: data.displayName?.trim() || undefined,
      });
      void navigate(resolveReturnTo(returnToQuery));
    } catch (err) {
      const errorKey = getAuthErrorKey(err);
      if (errorKey) {
        setFormError(t(errorKey));
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setFormError(null);
      setIsGoogleLoading(true);
      await signInWithGoogle();
      void navigate(resolveReturnTo(returnToQuery));
    } catch (err) {
      const errorKey = getAuthErrorKey(err);
      if (errorKey) {
        setFormError(t(errorKey));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const isPending = form.formState.isSubmitting || isGoogleLoading;

  return (
    <AuthFormCard
      title={t('auth.register.title')}
      description={t('auth.register.description')}
      footer={
        <div className="flex flex-wrap items-center justify-center gap-1">
          <span>{t('auth.register.haveAccount')}</span>
          <Link
            to={loginTo}
            className="text-primary font-medium hover:underline"
          >
            {t('auth.register.login')}
          </Link>
        </div>
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
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.fields.displayNameOptional')}</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    autoComplete="name"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.fields.password')}</FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete="new-password"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isPending}>
            {form.formState.isSubmitting && (
              <Loader2
                className="mr-2 size-4 animate-spin"
                aria-hidden="true"
              />
            )}
            {t('auth.register.submit')}
          </Button>

          <div className="relative my-4 flex items-center justify-center">
            <div className="border-border absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="bg-card text-muted-foreground relative px-2 text-xs uppercase">
              {t('auth.divider.or')}
            </div>
          </div>

          <GoogleButton
            onClick={() => {
              void handleGoogleSignIn();
            }}
            isLoading={isGoogleLoading}
            disabled={form.formState.isSubmitting}
          />
        </form>
      </Form>
    </AuthFormCard>
  );
}
