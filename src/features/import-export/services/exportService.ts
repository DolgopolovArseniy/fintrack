import { getAccountDisplayName, type Account } from '@/features/accounts';
import { getCategoryDisplayName, type Category } from '@/features/categories';
import type { Transaction } from '@/features/transactions';
import type { CurrencyCode } from '@/lib/currencies';
import { generateCsv, type CsvColumn, type CsvExportOptions } from '@/lib/csv';
import { fromMinorUnits } from '@/lib/money';

export type ExportTranslateFunction = (
  key: string,
  options?: Record<string, unknown>,
) => string;

export interface ExportRow {
  date: string;
  type: string;
  category: string;
  account: string;
  amount: number;
  currency: string;
  note: string;
  tags: string;
}

export interface ExportTransformParams {
  transactions: readonly Transaction[];
  categories: readonly Category[];
  accounts: readonly Account[];
  baseCurrency: CurrencyCode;
  t: ExportTranslateFunction;
  options?: CsvExportOptions;
}

function resolveCategoryName(
  categoryId: string,
  categoriesMap: Map<string, Category>,
  t: ExportTranslateFunction,
): string {
  const category = categoriesMap.get(categoryId);
  if (!category) {
    return '[Deleted / Unknown]';
  }
  const name = getCategoryDisplayName(category, (k, o) => t(k, o));
  return category.archived ? `${name} (archived)` : name;
}

function resolveAccountName(
  accountId: string,
  accountsMap: Map<string, Account>,
  t: ExportTranslateFunction,
): string {
  const account = accountsMap.get(accountId);
  if (!account) {
    return '[Deleted / Unknown]';
  }
  const name = getAccountDisplayName(account, (k, o) => t(k, o));
  return account.archived ? `${name} (archived)` : name;
}

/**
 * Builds the standard 8-column definition for CSV transaction export.
 * Headers are localized using the provided i18next translation function.
 */
export function buildTransactionCsvColumns(
  t: ExportTranslateFunction,
): CsvColumn<ExportRow>[] {
  return [
    {
      id: 'date',
      header: t('importExport.export.columns.date', {
        defaultValue: 'Date',
      }),
      accessor: (row) => row.date,
    },
    {
      id: 'type',
      header: t('importExport.export.columns.type', {
        defaultValue: 'Type',
      }),
      accessor: (row) => row.type,
    },
    {
      id: 'category',
      header: t('importExport.export.columns.category', {
        defaultValue: 'Category',
      }),
      accessor: (row) => row.category,
    },
    {
      id: 'account',
      header: t('importExport.export.columns.account', {
        defaultValue: 'Account',
      }),
      accessor: (row) => row.account,
    },
    {
      id: 'amount',
      header: t('importExport.export.columns.amount', {
        defaultValue: 'Amount',
      }),
      accessor: (row) => row.amount,
    },
    {
      id: 'currency',
      header: t('importExport.export.columns.currency', {
        defaultValue: 'Currency',
      }),
      accessor: (row) => row.currency,
    },
    {
      id: 'note',
      header: t('importExport.export.columns.note', {
        defaultValue: 'Note',
      }),
      accessor: (row) => row.note,
    },
    {
      id: 'tags',
      header: t('importExport.export.columns.tags', {
        defaultValue: 'Tags',
      }),
      accessor: (row) => row.tags,
    },
  ];
}

/**
 * Transforms an array of transactions into an RFC 4180 CSV string with resolved category and account display names,
 * converted money amounts from minor units, and localized types and headers.
 */
export function transformTransactionsToCsv(
  params: ExportTransformParams,
): string {
  const { transactions, categories, accounts, baseCurrency, t, options } =
    params;

  const categoriesMap = new Map<string, Category>(
    categories.map((c) => [c.id, c]),
  );
  const accountsMap = new Map<string, Account>(accounts.map((a) => [a.id, a]));

  const rows: ExportRow[] = transactions.map((tx) => ({
    date: tx.date,
    type:
      tx.type === 'income'
        ? t('importExport.export.columns.incomeType', {
            defaultValue: 'Income',
          })
        : t('importExport.export.columns.expenseType', {
            defaultValue: 'Expense',
          }),
    category: resolveCategoryName(tx.categoryId, categoriesMap, t),
    account: resolveAccountName(tx.accountId, accountsMap, t),
    amount: fromMinorUnits(tx.amount),
    currency: baseCurrency,
    note: tx.note ?? '',
    tags: tx.tags && tx.tags.length > 0 ? tx.tags.join(', ') : '',
  }));

  const columns = buildTransactionCsvColumns(t);
  return generateCsv(rows, columns, options);
}
