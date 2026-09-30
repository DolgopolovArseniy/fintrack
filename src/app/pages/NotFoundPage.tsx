import { FileQuestion, Home } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ROUTES } from '@/app/routes';
import { useTranslation } from '@/lib/i18n';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="flex max-w-md flex-col items-center justify-center p-8 text-center shadow-lg">
        <div className="bg-secondary text-primary flex size-14 items-center justify-center rounded-full">
          <FileQuestion className="size-7" aria-hidden="true" />
        </div>
        <h1 className="text-foreground mt-5 text-2xl font-bold tracking-tight">
          {t('placeholder.notFound.title')}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {t('placeholder.notFound.description')}
        </p>
        <div className="mt-6">
          <Button asChild className="gap-2">
            <Link to={ROUTES.dashboard}>
              <Home className="size-4" aria-hidden="true" />
              <span>{t('placeholder.notFound.goHome')}</span>
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
