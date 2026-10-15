import * as React from 'react';
import { FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { buildTransactionCsvColumns } from '../services/exportService';
import type { ExportTranslateFunction } from '../services/exportService';
import { buildImportTemplateRows } from '../services/importTemplate';
import { downloadCsvBlob, generateCsv } from '@/lib/csv';
import type { CurrencyCode } from '@/lib/currencies';
import { useTranslation } from '@/lib/i18n';
import type { UseCsvImportResult } from '../hooks/useCsvImport';

export interface FileDropzoneProps {
  importer: UseCsvImportResult;
  currency: CurrencyCode;
}

function isCsvFile(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith('.csv') ||
    file.type === 'text/csv' ||
    file.type === 'application/vnd.ms-excel'
  );
}

export function FileDropzone({ importer, currency }: FileDropzoneProps) {
  const { t, i18n } = useTranslation();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const openPicker = React.useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFiles = React.useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file && isCsvFile(file)) {
        void importer.loadFile(file);
      }
    },
    [importer],
  );

  const downloadTemplate = React.useCallback(() => {
    const delimiter = i18n.language === 'ru' ? ';' : ',';
    const translate: ExportTranslateFunction = (key, options) => {
      const defaultValue =
        typeof options?.defaultValue === 'string' ? options.defaultValue : key;
      return t(key, { defaultValue });
    };
    const columns = buildTransactionCsvColumns(translate);
    const content = generateCsv(
      buildImportTemplateRows(translate, currency),
      columns,
      {
        delimiter,
      },
    );
    downloadCsvBlob(content, 'fintrack-import-template.csv');
  }, [i18n.language, t, currency]);

  if (importer.isParsing) {
    return <LoadingSkeleton variant="list" count={3} />;
  }

  if (importer.globalError) {
    return (
      <ErrorState
        error={importer.globalError}
        title={t('import.upload.title')}
        description={t(
          `importExport.${importer.globalError.message}`,
          importer.globalError.message,
        )}
        onRetry={importer.reset}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        {t('import.upload.description')}
      </p>
      <div
        role="button"
        tabIndex={0}
        aria-label={t('import.upload.chooseFile')}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={
          isDragging
            ? 'border-primary bg-primary/5 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center sm:p-12'
            : 'border-border/60 bg-muted/20 flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center sm:p-12'
        }
      >
        <div className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-full">
          <FileUp className="size-7" aria-hidden="true" />
        </div>
        <p className="text-muted-foreground mt-4 text-sm">
          {t('import.upload.dropHint')}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="import-file-input"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = '';
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={openPicker}>
          {t('import.upload.chooseFile')}
        </Button>
        <Button type="button" variant="ghost" onClick={downloadTemplate}>
          {t('import.upload.templateButton')}
        </Button>
      </div>
    </div>
  );
}
