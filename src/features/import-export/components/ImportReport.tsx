import { Link } from 'react-router';
import { AccountBadge } from '@/components/common/AccountBadge';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { UseCsvImportResult } from '../hooks/useCsvImport';

export interface ImportReportProps {
  importer: UseCsvImportResult;
}

export function ImportReport({ importer }: ImportReportProps) {
  const { t } = useTranslation();
  const { report, rows, accounts } = importer;
  if (!report) {
    return null;
  }

  const validDates = rows
    .filter((row) => row.status === 'valid' && row.input !== null)
    .map((row) => (row.input ? row.input.date : ''))
    .sort();
  const month = (validDates[0] ?? '').slice(0, 7);

  const affectedAccounts = report.affectedAccounts
    .map((id) => accounts.find((acc) => acc.id === id))
    .filter((acc) => acc !== undefined);

  return (
    <div className="space-y-4" data-testid="import-report">
      <dl className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">
            {t('import.report.imported', { count: report.importedCount })}
          </dt>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">
            {t('import.report.skippedErrors', {
              count: report.skippedErrorCount,
            })}
          </dt>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">
            {t('import.report.skippedDuplicates', {
              count: report.skippedDuplicateCount,
            })}
          </dt>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">
            {t('import.report.skippedManual', {
              count: report.skippedManualCount,
            })}
          </dt>
        </div>
        {report.failedChunks > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-destructive">
              {t('import.report.failedChunks', { count: report.failedChunks })}
            </dt>
          </div>
        )}
      </dl>

      {affectedAccounts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">
            {t('import.report.affectedAccounts')}
          </h3>
          <ul className="flex flex-wrap gap-2">
            {affectedAccounts.map((acc) => (
              <li key={acc.id}>
                <AccountBadge
                  size="sm"
                  name={acc.name}
                  systemKey={acc.systemKey}
                  type={acc.type}
                  archived={acc.archived}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {report.failedChunks > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => void importer.retryFailedChunks()}
            disabled={importer.isImporting}
          >
            {t('import.report.retryRemaining')}
          </Button>
        )}
        {month && (
          <Button type="button" variant="outline" asChild>
            <Link to={`/app/transactions?month=${month}`}>
              {t('import.report.viewTransactions')}
            </Link>
          </Button>
        )}
        <Button type="button" onClick={importer.reset}>
          {t('import.report.importAnother')}
        </Button>
      </div>
    </div>
  );
}
