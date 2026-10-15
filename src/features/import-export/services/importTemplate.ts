import type { ExportTranslateFunction } from './exportService';

export interface ImportTemplateRow {
  date: string;
  type: string;
  category: string;
  account: string;
  amount: number;
  currency: string;
  note: string;
  tags: string;
}

/**
 * Sample rows for the downloadable import template. Names must be real
 * display names of the default system entities, otherwise the template
 * itself fails name resolution on import.
 */
export function buildImportTemplateRows(
  t: ExportTranslateFunction,
): ImportTemplateRow[] {
  return [
    {
      date: '2026-09-15',
      type: t('importExport.export.columns.expenseType', {
        defaultValue: 'Expense',
      }),
      category: t('categories.system.food', { defaultValue: 'Food' }),
      account: t('accounts.system.main', { defaultValue: 'Main account' }),
      amount: 125.5,
      currency: 'USD',
      note: 'Weekly shopping',
      tags: 'food, weekly',
    },
    {
      date: '2026-09-16',
      type: t('importExport.export.columns.incomeType', {
        defaultValue: 'Income',
      }),
      category: t('categories.system.salary', { defaultValue: 'Salary' }),
      account: t('accounts.system.main', { defaultValue: 'Main account' }),
      amount: 3000,
      currency: 'USD',
      note: '',
      tags: '',
    },
  ];
}
