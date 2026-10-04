import { Navigate } from 'react-router';
import { ROUTES } from '@/app/routes';
import { AuthFormCard, OnboardingForm, useAuth } from '@/features/auth';
import { useTranslation } from '@/lib/i18n';

export function OnboardingPage() {
  const { t } = useTranslation();
  const { profileStatus } = useAuth();

  if (profileStatus === 'ready') {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  return (
    <div data-testid="onboarding-page" className="mx-auto max-w-md space-y-6">
      <AuthFormCard
        title={t('categories.onboarding.title')}
        description={t('categories.onboarding.description')}
      >
        <div data-testid="onboarding-content">
          <OnboardingForm />
        </div>
      </AuthFormCard>
    </div>
  );
}
