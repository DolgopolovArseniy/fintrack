import { Construction } from 'lucide-react';
import type { NavKey } from '@/app/layouts/navItems';
import { Card } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';

export interface PlaceholderPageProps {
  titleKey: NavKey;
}

export function PlaceholderPage({ titleKey }: PlaceholderPageProps) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
          {t(titleKey)}
        </h2>
        <p className="text-muted-foreground text-xs sm:text-sm">
          {t('placeholder.comingSoon.description')}
        </p>
      </div>

      <Card className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center shadow-xs">
        <div className="bg-secondary text-primary flex size-12 items-center justify-center rounded-full">
          <Construction className="size-6" aria-hidden="true" />
        </div>
        <h3 className="text-foreground mt-4 text-base font-semibold">
          {t('placeholder.comingSoon.title')}
        </h3>
        <p className="text-muted-foreground mt-1.5 max-w-sm text-sm">
          {t('placeholder.comingSoon.description')}
        </p>
      </Card>
    </div>
  );
}
