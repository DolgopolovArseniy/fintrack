import { useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { useAccounts } from '@/features/accounts';
import { useAuth } from '@/features/auth';
import { useCategories } from '@/features/categories';
import type { Transaction } from '@/features/transactions';
import { buildExportFilename, downloadCsvBlob } from '@/lib/csv';
import { todayIso } from '@/lib/dates';
import { transformTransactionsToCsv } from '../services/exportService';

export function useQuickExport(): {
  exportCurrentView: (
    transactions: readonly Transaction[],
    filenameScope: string,
  ) => void;
} {
  const { profile } = useAuth();
  const categoriesResult = useCategories();
  const accountsResult = useAccounts();
  const { t, i18n } = useTranslation();

  const exportCurrentView = useCallback(
    (transactions: readonly Transaction[], filenameScope: string) => {
      if (transactions.length === 0) {
        toast(
          t('importExport.empty.noTransactions', {
            defaultValue:
              'No transactions found for the selected period and filters.',
          }),
        );
        return;
      }

      try {
        const delimiter = i18n.language === 'ru' ? ';' : ',';
        const baseCurrency = profile?.baseCurrency ?? 'USD';
        const categories =
          categoriesResult.status === 'success' ? categoriesResult.data : [];
        const accounts =
          accountsResult.status === 'success' ? accountsResult.data : [];

        const content = transformTransactionsToCsv({
          transactions,
          categories,
          accounts,
          baseCurrency,
          t: (key, opts) => t(key as never, opts),
          options: {
            delimiter,
            includeHeaders: true,
          },
        });

        const filename = buildExportFilename(filenameScope, todayIso());
        downloadCsvBlob(content, filename);

        toast.success(
          t('importExport.export.notifications.success', {
            count: transactions.length,
            defaultValue: `Exported ${transactions.length} transactions successfully`,
          }),
        );
      } catch {
        toast.error(
          t('importExport.errors.downloadFailed', {
            defaultValue: 'Failed to download CSV file',
          }),
        );
      }
    },
    [profile, categoriesResult, accountsResult, t, i18n.language],
  );

  return { exportCurrentView };
}
