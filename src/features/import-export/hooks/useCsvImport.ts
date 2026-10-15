import * as React from 'react';
import { toast } from 'sonner';
import { useAccounts, type Account } from '@/features/accounts';
import { useAuth } from '@/features/auth';
import { useCategories, type Category } from '@/features/categories';
import {
  chunkImportInputs,
  createTransactionsBatch,
  getTransactionsByDateRange,
  type ChunkWriteResult,
  type Transaction,
  type TransactionInput,
} from '@/features/transactions';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import type { CsvDelimiter } from '@/lib/csv';
import {
  autoMapColumns,
  parseCsvText,
  type ColumnMapping,
  type ParsedCsvTable,
} from '@/lib/csvImport';
import { MAX_IMPORT_FILE_SIZE, MAX_IMPORT_ROWS } from '@/lib/limits';
import { AppError, toAppError } from '@/lib/errors';
import { useTranslation } from '@/lib/i18n';
import {
  buildImportReport,
  mapRowsToInputs,
  markDuplicates,
  type ImportReportData,
  type NameResolution,
  type ValidatedImportRow,
} from '../services/importService';

export type ImportStep =
  'upload' | 'mapping' | 'preview' | 'importing' | 'result';

export type DelimiterSelection = CsvDelimiter | 'auto';

export interface ImportDefaults {
  accountId: string;
  expenseCategoryId: string;
  incomeCategoryId: string;
}

export interface UseCsvImportResult {
  step: ImportStep;
  table: ParsedCsvTable | null;
  mapping: ColumnMapping;
  setMapping: (patch: Partial<ColumnMapping>) => void;
  delimiter: DelimiterSelection;
  setDelimiter: (delimiter: DelimiterSelection) => void;
  rows: ValidatedImportRow[];
  includedCount: number;
  isParsing: boolean;
  isImporting: boolean;
  progress: { done: number; total: number };
  report: ImportReportData | null;
  globalError: AppError | null;
  loadFile: (file: File) => Promise<void>;
  goToPreview: () => boolean;
  setRowExcluded: (rowNumber: number, excluded: boolean) => void;
  excludeAllByStatus: (status: 'error' | 'duplicate') => void;
  startImport: () => Promise<void>;
  retryFailedChunks: () => Promise<void>;
  reset: () => void;
  categories: Category[];
  accounts: Account[];
  defaults: ImportDefaults;
  setDefaultOverride: (patch: Partial<ImportDefaults>) => void;
  categoryOverrides: Map<string, string>;
  accountOverrides: Map<string, string>;
  setNameOverride: (
    kind: 'category' | 'account',
    sourceName: string,
    id: string,
  ) => void;
  unmappedCategoryNames: string[];
  unmappedAccountNames: string[];
  isRangeTooWide: boolean;
  isOnline: boolean;
}

const EMPTY_MAPPING: ColumnMapping = {
  date: null,
  type: null,
  amount: null,
  category: null,
  account: null,
  note: null,
  tags: null,
};

/** Display-name candidates for one entity in both locales plus raw keys. */
function entityNameCandidates(
  entity: { name?: string; systemKey?: string },
  namespace: string,
  fallback: string,
  translate: (key: string, lng: 'en' | 'ru', fallback: string) => string,
): string[] {
  const names = [entity.name ?? '', entity.systemKey ?? ''];
  if (entity.systemKey) {
    names.push(
      translate(`${namespace}.system.${entity.systemKey}`, 'en', fallback),
      translate(`${namespace}.system.${entity.systemKey}`, 'ru', fallback),
    );
  }
  return names;
}

export function useCsvImport(): UseCsvImportResult {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();
  const categoriesResult = useCategories();
  const accountsResult = useAccounts();

  const categories = React.useMemo(
    () => (categoriesResult.status === 'success' ? categoriesResult.data : []),
    [categoriesResult],
  );
  const accounts = React.useMemo(
    () => (accountsResult.status === 'success' ? accountsResult.data : []),
    [accountsResult],
  );

  const [step, setStep] = React.useState<ImportStep>('upload');
  const [fileText, setFileText] = React.useState<string | null>(null);
  const [delimiter, setDelimiterState] =
    React.useState<DelimiterSelection>('auto');
  const [table, setTable] = React.useState<ParsedCsvTable | null>(null);
  const [mapping, setMappingState] =
    React.useState<ColumnMapping>(EMPTY_MAPPING);
  const [isParsing, setIsParsing] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [progress, setProgress] = React.useState({ done: 0, total: 0 });
  const [report, setReport] = React.useState<ImportReportData | null>(null);
  const [globalError, setGlobalError] = React.useState<AppError | null>(null);
  const [existing, setExisting] = React.useState<Transaction[]>([]);
  const [excludedOverrides, setExcludedOverrides] = React.useState<
    Record<number, boolean>
  >({});
  const [chunkResults, setChunkResults] = React.useState<ChunkWriteResult[]>(
    [],
  );
  const [failedInputs, setFailedInputs] = React.useState<TransactionInput[]>(
    [],
  );
  const [categoryOverrides, setCategoryOverrides] = React.useState<
    Map<string, string>
  >(new Map());
  const [accountOverrides, setAccountOverrides] = React.useState<
    Map<string, string>
  >(new Map());
  const [defaultOverrides, setDefaultOverrides] = React.useState<
    Partial<ImportDefaults>
  >({});

  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const stepRef = React.useRef(step);
  React.useEffect(() => {
    stepRef.current = step;
  });

  const fail = React.useCallback((message: string) => {
    setGlobalError(new AppError('validation', message));
  }, []);

  const resolution = React.useMemo<NameResolution>(() => {
    const translate = (key: string, lng: 'en' | 'ru', fallback: string) =>
      t(key, { lng, defaultValue: fallback });
    const categoryByName = new Map<string, string>();
    for (const cat of categories) {
      for (const name of entityNameCandidates(
        cat,
        'categories',
        cat.systemKey ?? '',
        translate,
      )) {
        if (name && !categoryByName.has(name)) {
          categoryByName.set(name, cat.id);
        }
      }
    }
    const accountByName = new Map<string, string>();
    for (const acc of accounts) {
      for (const name of entityNameCandidates(
        acc,
        'accounts',
        acc.systemKey === 'main' ? 'Main account' : (acc.systemKey ?? ''),
        translate,
      )) {
        if (name && !accountByName.has(name)) {
          accountByName.set(name, acc.id);
        }
      }
    }
    return {
      categoryByName,
      accountByName,
      defaultAccountId: '',
      defaultExpenseCategoryId: '',
      defaultIncomeCategoryId: '',
    };
  }, [categories, accounts, t]);

  const defaults = React.useMemo<ImportDefaults>(() => {
    const activeAccount = accounts.find((acc) => !acc.archived);
    const activeExpense = categories.find(
      (cat) => !cat.archived && cat.type === 'expense',
    );
    const activeIncome = categories.find(
      (cat) => !cat.archived && cat.type === 'income',
    );
    return {
      accountId: defaultOverrides.accountId ?? activeAccount?.id ?? '',
      expenseCategoryId:
        defaultOverrides.expenseCategoryId ?? activeExpense?.id ?? '',
      incomeCategoryId:
        defaultOverrides.incomeCategoryId ?? activeIncome?.id ?? '',
    };
  }, [accounts, categories, defaultOverrides]);

  const effectiveResolution = React.useMemo<NameResolution>(
    () => ({
      categoryByName: new Map([
        ...resolution.categoryByName,
        ...categoryOverrides,
      ]),
      accountByName: new Map([
        ...resolution.accountByName,
        ...accountOverrides,
      ]),
      defaultAccountId: defaults.accountId,
      defaultExpenseCategoryId: defaults.expenseCategoryId,
      defaultIncomeCategoryId: defaults.incomeCategoryId,
    }),
    [resolution, categoryOverrides, accountOverrides, defaults],
  );

  const baseRows = React.useMemo(
    () =>
      table
        ? mapRowsToInputs(
            table,
            mapping,
            effectiveResolution,
            categories,
            accounts,
          )
        : [],
    [table, mapping, effectiveResolution, categories, accounts],
  );

  const validDates = React.useMemo(() => {
    const dates = baseRows
      .filter((row) => row.status === 'valid' && row.input !== null)
      .map((row) => (row.input ? row.input.date : ''));
    return [...dates].sort();
  }, [baseRows]);

  const isRangeTooWide = React.useMemo(() => {
    if (validDates.length === 0) {
      return false;
    }
    const minDate = validDates[0] ?? '';
    const maxDate = validDates[validDates.length - 1] ?? '';
    const spanDays =
      (new Date(maxDate).getTime() - new Date(minDate).getTime()) / 86400000;
    return spanDays > 366;
  }, [validDates]);

  const rows = React.useMemo(
    () =>
      markDuplicates(baseRows, existing).map((row) => ({
        ...row,
        excluded: excludedOverrides[row.rowNumber] ?? row.status !== 'valid',
      })),
    [baseRows, existing, excludedOverrides],
  );

  const includedCount = React.useMemo(
    () => rows.filter((row) => row.status === 'valid' && !row.excluded).length,
    [rows],
  );

  const applyParsedText = React.useCallback(
    (text: string, delimiterSelection: DelimiterSelection) => {
      setIsParsing(true);
      setGlobalError(null);
      try {
        const parsed = parseCsvText(
          text,
          delimiterSelection === 'auto'
            ? undefined
            : { delimiter: delimiterSelection },
        );
        if (parsed.rows.length > MAX_IMPORT_ROWS) {
          setTable(null);
          fail('import.errors.fileTooLarge');
          return;
        }
        setTable(parsed);
        setMappingState(autoMapColumns(parsed.headers));
        setExcludedOverrides({});
        setExisting([]);
        setReport(null);
        setChunkResults([]);
        setFailedInputs([]);
        setStep('mapping');
      } catch (error) {
        setTable(null);
        fail(
          error instanceof AppError
            ? error.message
            : 'import.errors.parseFailed',
        );
      } finally {
        if (mountedRef.current) {
          setIsParsing(false);
        }
      }
    },
    [fail],
  );

  const loadFile = React.useCallback(
    async (file: File) => {
      if (file.size > MAX_IMPORT_FILE_SIZE) {
        fail('import.errors.fileTooLarge');
        return;
      }
      setIsParsing(true);
      try {
        const text = await file.text();
        if (!mountedRef.current) {
          return;
        }
        setFileText(text);
        setDelimiterState('auto');
        applyParsedText(text, 'auto');
      } catch {
        if (mountedRef.current) {
          fail('import.errors.parseFailed');
          setIsParsing(false);
        }
      }
    },
    [applyParsedText, fail],
  );

  const setDelimiter = React.useCallback(
    (next: DelimiterSelection) => {
      setDelimiterState(next);
      if (fileText !== null) {
        applyParsedText(fileText, next);
      }
    },
    [fileText, applyParsedText],
  );

  const setMapping = React.useCallback((patch: Partial<ColumnMapping>) => {
    setMappingState((prev) => ({ ...prev, ...patch }));
  }, []);

  const goToPreview = React.useCallback(() => {
    if (mapping.date === null || mapping.amount === null) {
      fail('import.errors.mappingRequired');
      return false;
    }
    setGlobalError(null);
    setExisting([]);
    setStep('preview');
    return true;
  }, [mapping, fail]);

  // Single range query for database duplicate check (ADR-010).
  React.useEffect(() => {
    if (step !== 'preview' || !user?.uid) {
      return;
    }
    if (validDates.length === 0 || isRangeTooWide) {
      return;
    }
    let isActive = true;
    const minDate = validDates[0] ?? '';
    const maxDate = validDates[validDates.length - 1] ?? '';
    getTransactionsByDateRange(user.uid, minDate, maxDate)
      .then((txs) => {
        if (isActive && mountedRef.current && stepRef.current === 'preview') {
          setExisting(txs);
        }
      })
      .catch(() => {
        if (isActive && mountedRef.current) {
          toast.error(t('import.errors.duplicatesFetchFailed'));
        }
      });
    return () => {
      isActive = false;
    };
  }, [step, user?.uid, validDates, isRangeTooWide, t]);

  const setRowExcluded = React.useCallback(
    (rowNumber: number, excluded: boolean) => {
      setExcludedOverrides((prev) => ({ ...prev, [rowNumber]: excluded }));
    },
    [],
  );

  const excludeAllByStatus = React.useCallback(
    (status: 'error' | 'duplicate') => {
      setExcludedOverrides((prev) => {
        const next = { ...prev };
        for (const row of baseRows) {
          if (row.status === status) {
            next[row.rowNumber] = true;
          }
        }
        return next;
      });
    },
    [baseRows],
  );

  const setNameOverride = React.useCallback(
    (kind: 'category' | 'account', sourceName: string, id: string) => {
      if (kind === 'category') {
        setCategoryOverrides((prev) => new Map(prev).set(sourceName, id));
      } else {
        setAccountOverrides((prev) => new Map(prev).set(sourceName, id));
      }
    },
    [],
  );

  const setDefaultOverride = React.useCallback(
    (patch: Partial<ImportDefaults>) => {
      setDefaultOverrides((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const startImport = React.useCallback(async () => {
    const uid = user?.uid;
    if (!uid || !isOnline) {
      return;
    }
    const inputs = rows
      .filter((row) => row.status === 'valid' && !row.excluded)
      .map((row) => {
        if (!row.input) {
          throw new Error('Valid row without input');
        }
        return row.input;
      });
    if (inputs.length === 0) {
      return;
    }
    setIsImporting(true);
    setStep('importing');
    setProgress({ done: 0, total: inputs.length });
    try {
      const results = await createTransactionsBatch(
        uid,
        inputs,
        (done, total) => {
          if (mountedRef.current) {
            setProgress({ done, total });
          }
        },
      );
      if (!mountedRef.current) {
        return;
      }
      setChunkResults(results);
      const chunks = chunkImportInputs(inputs);
      setFailedInputs(
        results
          .filter((result) => result.status === 'failed')
          .flatMap((result) => chunks[result.chunkIndex] ?? []),
      );
      setReport(buildImportReport(rows, results));
      setStep('result');
      const imported = results
        .filter((result) => result.status === 'ok')
        .reduce((sum, result) => sum + result.written, 0);
      toast.success(t('import.report.toast', { count: imported }));
    } catch (error) {
      if (mountedRef.current) {
        setGlobalError(toAppError(error));
      }
    } finally {
      if (mountedRef.current) {
        setIsImporting(false);
      }
    }
  }, [user?.uid, isOnline, rows, t]);

  const retryFailedChunks = React.useCallback(async () => {
    const uid = user?.uid;
    if (!uid || !isOnline || failedInputs.length === 0) {
      return;
    }
    setIsImporting(true);
    try {
      const results = await createTransactionsBatch(
        uid,
        failedInputs,
        (done, total) => {
          if (mountedRef.current) {
            setProgress({ done, total });
          }
        },
      );
      if (!mountedRef.current) {
        return;
      }
      const merged = [
        ...chunkResults.filter((result) => result.status === 'ok'),
        ...results,
      ];
      setChunkResults(merged);
      const chunks = chunkImportInputs(failedInputs);
      setFailedInputs(
        results
          .filter((result) => result.status === 'failed')
          .flatMap((result) => chunks[result.chunkIndex] ?? []),
      );
      setReport(buildImportReport(rows, merged));
    } catch (error) {
      if (mountedRef.current) {
        setGlobalError(toAppError(error));
      }
    } finally {
      if (mountedRef.current) {
        setIsImporting(false);
      }
    }
  }, [user?.uid, isOnline, failedInputs, chunkResults, rows]);

  const reset = React.useCallback(() => {
    setStep('upload');
    setFileText(null);
    setDelimiterState('auto');
    setTable(null);
    setMappingState(EMPTY_MAPPING);
    setGlobalError(null);
    setExisting([]);
    setExcludedOverrides({});
    setProgress({ done: 0, total: 0 });
    setReport(null);
    setChunkResults([]);
    setFailedInputs([]);
    setCategoryOverrides(new Map());
    setAccountOverrides(new Map());
    setDefaultOverrides({});
  }, []);

  const { unmappedCategoryNames, unmappedAccountNames } = React.useMemo(() => {
    if (!table) {
      return { unmappedCategoryNames: [], unmappedAccountNames: [] };
    }
    const collect = (field: 'category' | 'account'): string[] => {
      const index = mapping[field];
      if (index === null) {
        return [];
      }
      const lookup =
        field === 'category'
          ? effectiveResolution.categoryByName
          : effectiveResolution.accountByName;
      const seen = new Set<string>();
      const names: string[] = [];
      for (const row of table.rows) {
        const raw = (row[index] ?? '').trim();
        if (!raw || seen.has(raw.toLowerCase())) {
          continue;
        }
        seen.add(raw.toLowerCase());
        if (!lookup.has(raw) && !lookup.has(raw.toLowerCase())) {
          names.push(raw);
        }
      }
      return names;
    };
    return {
      unmappedCategoryNames: collect('category'),
      unmappedAccountNames: collect('account'),
    };
  }, [table, mapping, effectiveResolution]);

  return {
    step,
    table,
    mapping,
    setMapping,
    delimiter,
    setDelimiter,
    rows,
    includedCount,
    isParsing,
    isImporting,
    progress,
    report,
    globalError,
    loadFile,
    goToPreview,
    setRowExcluded,
    excludeAllByStatus,
    startImport,
    retryFailedChunks,
    reset,
    categories,
    accounts,
    defaults,
    setDefaultOverride,
    categoryOverrides,
    accountOverrides,
    setNameOverride,
    unmappedCategoryNames,
    unmappedAccountNames,
    isRangeTooWide,
    isOnline,
  };
}
