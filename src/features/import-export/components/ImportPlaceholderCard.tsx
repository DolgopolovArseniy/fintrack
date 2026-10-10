import { FileUp, Sparkles } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';

export interface ImportPlaceholderCardProps {
  className?: string;
}

export function ImportPlaceholderCard({
  className,
}: ImportPlaceholderCardProps) {
  const { t } = useTranslation();

  return (
    <Card className={className} data-testid="import-placeholder-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
              <FileUp className="size-4" />
            </div>
            <div>
              <CardTitle>{t('importExport.importPromo.title')}</CardTitle>
              <CardDescription className="mt-1">
                {t('importExport.description')}
              </CardDescription>
            </div>
          </div>
          <span
            data-testid="import-badge"
            className="border-primary/30 bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
          >
            <Sparkles className="size-3" />
            {t('importExport.importPromo.badge')}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border-border/60 bg-muted/20 flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center sm:p-12">
          <div className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-full">
            <FileUp className="size-7" />
          </div>
          <h3 className="text-foreground mt-4 text-base font-semibold tracking-tight">
            {t('importExport.importPromo.title')}
          </h3>
          <p className="text-muted-foreground mt-2 max-w-md text-sm leading-relaxed">
            {t('importExport.importPromo.description')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
