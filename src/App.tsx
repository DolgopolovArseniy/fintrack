import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { AppLayout } from '@/app/layouts/AppLayout';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

function AppContent() {
  const { t } = useTranslation();

  return (
    <AppLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.welcome')}</CardTitle>
            <CardDescription>{t('dashboard.description')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="default">{t('common.actions.primary')}</Button>
            <Button variant="secondary">{t('common.actions.secondary')}</Button>
            <Button variant="outline">{t('common.actions.outline')}</Button>
            <Button variant="destructive">
              {t('common.actions.destructive')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
