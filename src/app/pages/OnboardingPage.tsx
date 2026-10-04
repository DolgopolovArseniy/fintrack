import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';

export function OnboardingPage() {
  const { t } = useTranslation();

  return (
    <div data-testid="onboarding-page" className="mx-auto max-w-md space-y-6">
      <Card className="w-full shadow-md">
        <CardHeader>
          <CardTitle>{t('common.appName')}</CardTitle>
          <CardDescription>
            {t('placeholder.comingSoon.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div data-testid="onboarding-content" />
        </CardContent>
      </Card>
    </div>
  );
}
