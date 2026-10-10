import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { useAccounts } from '@/features/accounts';
import { useAuth } from '@/features/auth';
import { useCategories } from '@/features/categories';
import {
  getTransactionsByDateRange,
  type Transaction,
} from '@/features/transactions';
import { buildExportFilename, downloadCsvBlob } from '@/lib/csv';
import {
  addMonths,
  compareIsoDates,
  currentYearMonth,
  isValidIsoDate,
  monthRange,
  todayIso,
  type IsoDate,
} from '@/lib/dates';
import {
  exportConfigSchema,
  type ExportConfig,
  type ExportScopePreset,
} from '../schemas';
import { transformTransactionsToCsv } from '../services/exportService';

export interface UseExportTransactionsResult {
  config: ExportConfig;
  setConfig: (patch: Partial<ExportConfig>) => void;
  isExporting: boolean;
  matchingCount: number;
  isLoadingCount: boolean;
  exportCsv: () => void;
}

export function resolvePresetDateRange(
  preset: ExportScopePreset,
  customStart?: string,
  customEnd?: string,
): { start: IsoDate; end: IsoDate; isValid: boolean } {
  const currentMonth = currentYearMonth();
  switch (preset) {
    case 'currentMonth': {
      const range = monthRange(currentMonth);
      return { start: range.start, end: range.end, isValid: true };
    }
    case 'prevMonth': {
      const prev = addMonths(currentMonth, -1);
      const range = monthRange(prev);
      return { start: range.start, end: range.end, isValid: true };
    }
    case 'last3Months': {
      const startMonth = addMonths(currentMonth, -2);
      return {
        start: monthRange(startMonth).start,
        end: monthRange(currentMonth).end,
        isValid: true,
      };
    }
    case 'last6Months': {
      const startMonth = addMonths(currentMonth, -5);
      return {
        start: monthRange(startMonth).start,
        end: monthRange(currentMonth).end,
        isValid: true,
      };
    }
    case 'thisYear': {
      const year = currentMonth.slice(0, 4);
      return {
        start: `${year}-01-01`,
        end: `${year}-12-31`,
        isValid: true,
      };
    }
    case 'allTime': {
      return {
        start: '1970-01-01',
        end: '2099-12-31',
        isValid: true,
      };
    }
    case 'custom': {
      const isValid =
        Boolean(customStart && customEnd) &&
        isValidIsoDate(customStart!) &&
        isValidIsoDate(customEnd!) &&
        compareIsoDates(customStart!, customEnd!) <= 0;
      return {
        start: customStart ?? '',
        end: customEnd ?? '',
        isValid,
      };
    }
  }
}

export function getPresetFilenameScope(
  preset: ExportScopePreset,
  start: string,
  end: string,
): string {
  switch (preset) {
    case 'currentMonth':
      return currentYearMonth();
    case 'prevMonth':
      return addMonths(currentYearMonth(), -1);
    case 'last3Months':
      return 'last-3-months';
    case 'last6Months':
      return 'last-6-months';
    case 'thisYear':
      return currentYearMonth().slice(0, 4);
    case 'allTime':
      return 'all-time';
    case 'custom':
      return `custom-${start}-${end}`;
  }
}

export function useExportTransactions(): UseExportTransactionsResult {
  const { user, profile } = useAuth();
  const categoriesResult = useCategories();
  const accountsResult = useAccounts();
  const { t, i18n } = useTranslation();

  const categories = useMemo(
    () => (categoriesResult.status === 'success' ? categoriesResult.data : []),
    [categoriesResult],
  );

  const accounts = useMemo(
    () => (accountsResult.status === 'success' ? accountsResult.data : []),
    [accountsResult],
  );

  const [config, setConfigState] = useState<ExportConfig>(() =>
    exportConfigSchema.parse({
      preset: 'currentMonth',
      delimiter: i18n.language === 'ru' ? ';' : ',',
    }),
  );

  const setConfig = useCallback((patch: Partial<ExportConfig>) => {
    setConfigState((prev) => ({
      ...prev,
      ...patch,
    }));
  }, []);

  const { start, end, isValid } = useMemo(
    () =>
      resolvePresetDateRange(config.preset, config.startDate, config.endDate),
    [config.preset, config.startDate, config.endDate],
  );

  const currentQueryKey =
    Boolean(user?.uid) && isValid ? `${user?.uid}:${start}:${end}` : '';

  const [loadedData, setLoadedData] = useState<{
    queryKey: string;
    transactions: Transaction[];
  }>({
    queryKey: '',
    transactions: [],
  });

  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Fetch transactions for date range
  useEffect(() => {
    if (!user?.uid || !isValid) {
      return;
    }

    let isSubscribed = true;
    const queryKey = `${user.uid}:${start}:${end}`;

    getTransactionsByDateRange(user.uid, start, end)
      .then((txs) => {
        if (isSubscribed) {
          setLoadedData({
            queryKey,
            transactions: txs,
          });
        }
      })
      .catch(() => {
        if (isSubscribed) {
          setLoadedData({
            queryKey,
            transactions: [],
          });
          toast.error(
            t('importExport.errors.fetchFailed', {
              defaultValue: 'Failed to load transactions for export',
            }),
          );
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [user?.uid, start, end, isValid, t]);

  const rawTransactions = useMemo(() => {
    if (!currentQueryKey || loadedData.queryKey !== currentQueryKey) {
      return [];
    }
    return loadedData.transactions;
  }, [currentQueryKey, loadedData]);

  const isLoadingCount =
    Boolean(user?.uid) && isValid && loadedData.queryKey !== currentQueryKey;

  // Client-side filtering by type, category, account
  const matchingTransactions = useMemo(() => {
    return rawTransactions.filter((tx) => {
      if (config.type !== 'all' && tx.type !== config.type) {
        return false;
      }
      if (config.categoryId !== 'all' && tx.categoryId !== config.categoryId) {
        return false;
      }
      if (config.accountId !== 'all' && tx.accountId !== config.accountId) {
        return false;
      }
      return true;
    });
  }, [rawTransactions, config.type, config.categoryId, config.accountId]);

  const matchingCount = matchingTransactions.length;

  const exportCsv = useCallback(() => {
    if (matchingTransactions.length === 0) {
      toast(
        t('importExport.empty.noTransactions', {
          defaultValue:
            'No transactions found for the selected period and filters.',
        }),
      );
      return;
    }

    setIsExporting(true);

    try {
      const baseCurrency = profile?.baseCurrency ?? 'USD';
      const content = transformTransactionsToCsv({
        transactions: matchingTransactions,
        categories,
        accounts,
        baseCurrency,
        t: (key, opts) => t(key as never, opts),
        options: {
          delimiter: config.delimiter,
          includeHeaders: config.includeHeaders,
        },
      });

      const scopeLabel = getPresetFilenameScope(config.preset, start, end);
      const filename = buildExportFilename(scopeLabel, todayIso());

      downloadCsvBlob(content, filename);

      toast.success(
        t('importExport.export.notifications.success', {
          count: matchingTransactions.length,
          defaultValue: `Exported ${matchingTransactions.length} transactions successfully`,
        }),
      );
    } catch {
      toast.error(
        t('importExport.errors.downloadFailed', {
          defaultValue: 'Failed to download CSV file',
        }),
      );
    } finally {
      setIsExporting(false);
    }
  }, [
    matchingTransactions,
    profile,
    categories,
    accounts,
    t,
    config.delimiter,
    config.includeHeaders,
    config.preset,
    start,
    end,
  ]);

  return {
    config,
    setConfig,
    isExporting,
    matchingCount,
    isLoadingCount,
    exportCsv,
  };
}
