import * as React from 'react';
import { AlertTriangle, Check, XCircle } from 'lucide-react';
import { AccountBadge } from '@/components/common/AccountBadge';
import { CategoryBadge } from '@/components/common/CategoryBadge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { MoneyText } from '@/components/common/MoneyText';
import { Button } from '@/components/ui/button';
import type { CurrencyCode } from '@/lib/currencies';
import { useTranslation } from '@/lib/i18n';
import type { ValidatedImportRow } from '../services/importService';
import type { UseCsvImportResult } from '../hooks/useCsvImport';

export interface ImportPreviewTableProps {
  importer: UseCsvImportResult;
  currency: CurrencyCode;
}

type RowFilter = 'all' | 'error' | 'duplicate';

const PAGE_SIZE = 200;

export function ImportPreviewTable({
  importer,
  currency,
}: ImportPreviewTableProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = React.useState<RowFilter>('all');
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const { rows } = importer;
  const validCount = rows.filter((row) => row.status === 'valid').length;
  const errorCount = rows.filter((row) => row.status === 'error').length;
  const duplicateCount = rows.filter(
    (row) => row.status === 'duplicate',
  ).length;

  const filtered =
    filter === 'all' ? rows : rows.filter((row) => row.status === filter);
  const visible = filtered.slice(0, visibleCount);

  const handleImportClick = () => {
    if (importer.includedCount >= 100) {
      setConfirmOpen(true);
    } else {
      void importer.startImport();
    }
  };

  return (
    <div className="space-y-4">
      <p
        aria-live="polite"
        className="text-muted-foreground text-sm"
        data-testid="import-counters"
      >
        {t('import.preview.counters', {
          valid: validCount,
          errors: errorCount,
          duplicates: duplicateCount,
        })}
      </p>

      {importer.isRangeTooWide && (
        <p
          role="note"
          className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 select-none dark:text-amber-400"
        >
          <AlertTriangle aria-hidden="true" className="size-3" />
          {t('import.preview.rangeTooWide')}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2" role="group">
        {(['all', 'error', 'duplicate'] as RowFilter[]).map((option) => (
          <Button
            key={option}
            type="button"
            variant={filter === option ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setFilter(option);
              setVisibleCount(PAGE_SIZE);
            }}
          >
            {t(`import.preview.filters.${option}`, option)}
          </Button>
        ))}
        {duplicateCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => importer.excludeAllByStatus('duplicate')}
          >
            {t('import.preview.skipDuplicates')}
          </Button>
        )}
      </div>

      {importer.includedCount === 0 ? (
        <EmptyState
          title={t('import.preview.emptyValid')}
          description={t('import.preview.emptyValidDescription')}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <tbody>
              {visible.map((row) => (
                <PreviewRow
                  key={row.rowNumber}
                  row={row}
                  importer={importer}
                  currency={currency}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > visible.length && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
        >
          {t('import.preview.showMore')}
        </Button>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {!importer.isOnline && (
          <p role="alert" className="text-destructive text-sm">
            {t('import.errors.offlineBlocked')}
          </p>
        )}
        <Button
          type="button"
          disabled={importer.includedCount === 0 || !importer.isOnline}
          onClick={handleImportClick}
          data-testid="import-start-button"
          className="w-full sm:w-auto"
        >
          {t('import.preview.importAction', { count: importer.includedCount })}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('import.preview.importConfirmTitle', {
          count: importer.includedCount,
        })}
        description={t('import.preview.importConfirmDescription')}
        confirmLabel={t('import.preview.importAction', {
          count: importer.includedCount,
        })}
        onConfirm={() => {
          setConfirmOpen(false);
          void importer.startImport();
        }}
      />
    </div>
  );
}

function PreviewRow({
  row,
  importer,
  currency,
}: {
  row: ValidatedImportRow;
  importer: UseCsvImportResult;
  currency: CurrencyCode;
}) {
  const { t } = useTranslation();
  const { table, mapping } = importer;

  const rawCell = (field: 'date' | 'amount' | 'note'): string => {
    const index = mapping[field];
    if (index === null || !table) {
      return '';
    }
    return (table.rows[row.rowNumber - 1]?.[index] ?? '').trim();
  };

  const category = row.input
    ? importer.categories.find((cat) => cat.id === row.input?.categoryId)
    : undefined;
  const account = row.input
    ? importer.accounts.find((acc) => acc.id === row.input?.accountId)
    : undefined;

  return (
    <tr
      className="border-border/60 border-b last:border-0"
      data-testid={`import-row-${row.rowNumber}`}
      data-status={row.status}
    >
      <td className="px-2 py-2">
        <RowStatusIcon status={row.status} />
      </td>
      <td className="px-2 py-2 whitespace-nowrap tabular-nums">
        {row.input?.date ?? rawCell('date')}
      </td>
      <td className="px-2 py-2 whitespace-nowrap">
        {row.input ? (
          <CategoryBadge
            size="sm"
            name={category?.name}
            systemKey={category?.systemKey}
            icon={category?.icon}
            color={category?.color}
            archived={category?.archived}
          />
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </td>
      <td className="px-2 py-2 whitespace-nowrap">
        {row.input ? (
          <AccountBadge
            size="sm"
            name={account?.name}
            systemKey={account?.systemKey}
            type={account?.type}
            archived={account?.archived}
          />
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </td>
      <td className="px-2 py-2 text-right whitespace-nowrap">
        {row.input ? (
          <MoneyText
            amount={row.input.amount}
            type={row.input.type}
            currency={currency}
            size="sm"
          />
        ) : (
          <span className="text-muted-foreground text-xs">
            {rawCell('amount')}
          </span>
        )}
      </td>
      <td className="max-w-48 truncate px-2 py-2">
        {row.input?.note ?? rawCell('note')}
      </td>
      <td className="px-2 py-2">
        {row.errors.length > 0 && (
          <span className="text-destructive text-xs">
            {row.errors.map((key) => t(`importExport.${key}`, key)).join('; ')}
          </span>
        )}
      </td>
      <td className="px-2 py-2">
        <input
          type="checkbox"
          className="accent-primary size-4"
          aria-label={t('import.preview.includeRow', { row: row.rowNumber })}
          disabled={row.status === 'error'}
          checked={!row.excluded}
          onChange={(event) =>
            importer.setRowExcluded(row.rowNumber, !event.target.checked)
          }
        />
      </td>
    </tr>
  );
}

function RowStatusIcon({ status }: { status: ValidatedImportRow['status'] }) {
  if (status === 'valid') {
    return (
      <Check
        aria-hidden="true"
        className="text-income size-4"
        data-testid="row-status-valid"
      />
    );
  }
  if (status === 'duplicate') {
    return (
      <AlertTriangle
        aria-hidden="true"
        className="size-4 text-amber-600 dark:text-amber-400"
        data-testid="row-status-duplicate"
      />
    );
  }
  return (
    <XCircle
      aria-hidden="true"
      className="text-destructive size-4"
      data-testid="row-status-error"
    />
  );
}
