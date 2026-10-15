import { FileUp } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { useAuth } from '@/features/auth';
import type { CurrencyCode } from '@/lib/currencies';
import { DEFAULT_CURRENCY } from '@/lib/currencies';
import { useTranslation } from '@/lib/i18n';
import { ColumnMapper } from './ColumnMapper';
import { FileDropzone } from './FileDropzone';
import { ImportPreviewTable } from './ImportPreviewTable';
import { ImportReport } from './ImportReport';
import { useCsvImport, type ImportStep } from '../hooks/useCsvImport';

export interface ImportCardProps {
  className?: string;
}

const STEPS: ImportStep[] = ['upload', 'mapping', 'preview', 'result'];

export function ImportCard({ className }: ImportCardProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const importer = useCsvImport();

  const currency: CurrencyCode = profile?.baseCurrency ?? DEFAULT_CURRENCY;
  const activeStep: ImportStep =
    importer.step === 'importing' ? 'preview' : importer.step;

  return (
    <Card className={className} data-testid="import-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
            <FileUp className="size-4" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>{t('import.upload.title')}</CardTitle>
            <CardDescription className="mt-1">
              {t('import.upload.description')}
            </CardDescription>
          </div>
        </div>
        <ol className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {STEPS.map((step) => (
            <li
              key={step}
              aria-current={activeStep === step ? 'step' : undefined}
              className={
                activeStep === step
                  ? 'text-foreground font-semibold'
                  : 'text-muted-foreground'
              }
            >
              {t(`import.steps.${step}`, step)}
            </li>
          ))}
        </ol>
      </CardHeader>

      <CardContent>
        {importer.step === 'upload' && (
          <FileDropzone importer={importer} currency={currency} />
        )}
        {importer.step === 'mapping' && <ColumnMapper importer={importer} />}
        {importer.step === 'preview' && (
          <ImportPreviewTable importer={importer} currency={currency} />
        )}
        {importer.step === 'importing' && (
          <div className="space-y-4">
            <p aria-live="polite" className="text-muted-foreground text-sm">
              {t('import.preview.importing', {
                done: importer.progress.done,
                total: importer.progress.total,
              })}
            </p>
            <LoadingSkeleton variant="list" count={3} />
          </div>
        )}
        {importer.step === 'result' && <ImportReport importer={importer} />}
        {importer.globalError &&
          importer.step !== 'mapping' &&
          importer.step !== 'upload' &&
          importer.globalError.message !== 'import.errors.mappingRequired' && (
            <div className="mt-4">
              <ErrorState
                error={importer.globalError}
                description={t(
                  `importExport.${importer.globalError.message}`,
                  importer.globalError.message,
                )}
                onRetry={importer.reset}
              />
            </div>
          )}
      </CardContent>
    </Card>
  );
}
