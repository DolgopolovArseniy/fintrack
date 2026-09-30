import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';

export function RegisterPage() {
  const { t } = useTranslation();

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">
          {t('placeholder.comingSoon.title')}
        </CardTitle>
        <CardDescription>
          {t('placeholder.comingSoon.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-xs">
          {t('placeholder.comingSoon.description')}
        </p>
      </CardContent>
    </Card>
  );
}
