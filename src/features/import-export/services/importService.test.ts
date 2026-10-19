import { describe, expect, it } from 'vitest';
import type { Account } from '@/features/accounts';
import type { Category } from '@/features/categories';
import { buildAccount, buildCategory } from '@/test/factories';
import {
  autoMapColumns,
  parseCsvText,
  type ColumnMapping,
  type ParsedCsvTable,
} from '@/lib/csvImport';
import {
  buildImportReport,
  mapRowsToInputs,
  markDuplicates,
  type NameResolution,
  type ValidatedImportRow,
} from './importService';

const categories: Category[] = [
  buildCategory({
    id: 'cat-food',
    name: 'Groceries',
    type: 'expense',
    archived: false,
  }),
  buildCategory({
    id: 'cat-salary',
    name: 'Зарплата',
    type: 'income',
    archived: false,
  }),
  buildCategory({
    id: 'cat-archived',
    name: 'Old Food',
    type: 'expense',
    archived: true,
  }),
];

const accounts: Account[] = [
  buildAccount({ id: 'acc-card', name: 'Main Card', archived: false }),
  buildAccount({ id: 'acc-cash', name: 'Наличные', archived: false }),
];

const resolution: NameResolution = {
  categoryByName: new Map(),
  accountByName: new Map(),
  defaultAccountId: 'acc-card',
  defaultExpenseCategoryId: 'cat-food',
  defaultIncomeCategoryId: 'cat-salary',
};

function tableOf(csv: string): ParsedCsvTable {
  return parseCsvText(csv);
}

function mappingOf(table: ParsedCsvTable): ColumnMapping {
  return autoMapColumns(table.headers);
}

describe('importService', () => {
  describe('mapRowsToInputs', () => {
    it('maps a canonical export round-trip 1-to-1', () => {
      const table = tableOf(
        'Date,Type,Category,Account,Amount,Currency,Note,Tags\n' +
          '2026-09-15,Expense,Groceries,Main Card,125.50,USD,Weekly shop,"food, weekly"\n',
      );
      const rows = mapRowsToInputs(
        table,
        mappingOf(table),
        resolution,
        categories,
        accounts,
        'USD',
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        rowNumber: 1,
        status: 'valid',
        errors: [],
        duplicateOf: null,
        excluded: false,
      });
      expect(rows[0]?.input).toEqual({
        type: 'expense',
        amount: 12550,
        accountId: 'acc-card',
        categoryId: 'cat-food',
        date: '2026-09-15',
        note: 'Weekly shop',
        tags: ['food', 'weekly'],
      });
    });

    it('omits empty notes and tags instead of writing nulls', () => {
      const table = tableOf(
        'Date,Type,Category,Account,Amount\n2026-09-15,Expense,Groceries,Main Card,10\n',
      );
      const rows = mapRowsToInputs(
        table,
        mappingOf(table),
        resolution,
        categories,
        accounts,
        'USD',
      );
      expect(rows[0]?.input).toEqual({
        type: 'expense',
        amount: 1000,
        accountId: 'acc-card',
        categoryId: 'cat-food',
        date: '2026-09-15',
      });
    });

    it('resolves names case-insensitively in both locales', () => {
      const table = tableOf(
        'Date,Type,Category,Account,Amount\n' +
          '2026-09-15,Income,зарплата,наличные,30000\n',
      );
      const rows = mapRowsToInputs(
        table,
        mappingOf(table),
        resolution,
        categories,
        accounts,
        'USD',
      );
      expect(rows[0]?.status).toBe('valid');
      expect(rows[0]?.input).toMatchObject({
        accountId: 'acc-cash',
        categoryId: 'cat-salary',
      });
    });

    it('resolves archived entities like regular ones', () => {
      const table = tableOf(
        'Date,Type,Category,Account,Amount\n2026-09-15,Expense,Old Food,Main Card,5\n',
      );
      const rows = mapRowsToInputs(
        table,
        mappingOf(table),
        resolution,
        categories,
        accounts,
        'USD',
      );
      expect(rows[0]?.input).toMatchObject({ categoryId: 'cat-archived' });
    });

    it('applies name overrides and defaults for empty cells', () => {
      const table = tableOf(
        'Date,Type,Category,Account,Amount\n' +
          '2026-09-15,Expense,Кофейни,,7.5\n' +
          '2026-09-16,Income,,,200\n',
      );
      const withOverride: NameResolution = {
        ...resolution,
        categoryByName: new Map([['кофейни', 'cat-food']]),
      };
      const rows = mapRowsToInputs(
        table,
        mappingOf(table),
        withOverride,
        categories,
        accounts,
        'USD',
      );
      expect(rows[0]?.input).toMatchObject({
        categoryId: 'cat-food',
        accountId: 'acc-card',
      });
      expect(rows[1]?.input).toMatchObject({
        categoryId: 'cat-salary',
        accountId: 'acc-card',
      });
    });

    it('derives the type from the amount sign when Type is unmapped', () => {
      const table = tableOf(
        'Дата,Заметка,Сумма\n15.09.2026,Shop,-500\n16.09.2026,Pay,+30000\n',
      );
      const mapping = mappingOf(table);
      const rows = mapRowsToInputs(
        table,
        mapping,
        resolution,
        categories,
        accounts,
        'USD',
      );
      expect(rows[0]?.input).toMatchObject({ type: 'expense', amount: 50000 });
      expect(rows[1]?.input).toMatchObject({ type: 'income', amount: 3000000 });
    });

    it('reports broken rows with 1-based numbers without blocking valid ones', () => {
      const table = tableOf(
        'Date,Type,Category,Account,Amount\n' +
          '2026-09-15,Expense,Groceries,Main Card,10\n' +
          '31.02.2026,Expense,Groceries,Main Card,10\n' +
          '2026-09-17,Expense,Groceries,Main Card,\n' +
          '2026-09-18,Expense,Groceries,Main Card,999999999999\n',
      );
      const rows = mapRowsToInputs(
        table,
        mappingOf(table),
        resolution,
        categories,
        accounts,
        'USD',
      );
      expect(rows.map((row) => row.status)).toEqual([
        'valid',
        'error',
        'error',
        'error',
      ]);
      expect(rows[1]).toMatchObject({
        rowNumber: 2,
        input: null,
        excluded: true,
        errors: ['import.rowErrors.dateInvalid'],
      });
      expect(rows[2]).toMatchObject({
        rowNumber: 3,
        errors: ['import.rowErrors.amountInvalid'],
      });
      expect(rows[3]).toMatchObject({
        rowNumber: 4,
        errors: ['import.rowErrors.amountTooLarge'],
      });
    });

    it('rejects unknown names and category type mismatches', () => {
      const table = tableOf(
        'Date,Type,Category,Account,Amount\n' +
          '2026-09-15,Income,Groceries,Main Card,10\n' +
          '2026-09-16,Expense,Nope,Main Card,10\n' +
          '2026-09-17,Expense,Groceries,Nope Bank,10\n',
      );
      const rows = mapRowsToInputs(
        table,
        mappingOf(table),
        resolution,
        categories,
        accounts,
        'USD',
      );
      expect(rows[0]).toMatchObject({
        status: 'error',
        errors: ['import.rowErrors.categoryTypeMismatch'],
      });
      expect(rows[1]).toMatchObject({
        status: 'error',
        errors: ['import.rowErrors.unknownCategory'],
      });
      expect(rows[2]).toMatchObject({
        status: 'error',
        errors: ['import.rowErrors.unknownAccount'],
      });
    });

    it('rejects rows whose currency differs from the base currency', () => {
      const table = tableOf(
        'Date,Type,Category,Account,Amount,Currency\n' +
          '2026-09-15,Expense,Groceries,Main Card,10,USD\n' +
          '2026-09-16,Expense,Groceries,Main Card,10,EUR\n' +
          '2026-09-17,Expense,Groceries,Main Card,10,\n',
      );
      const rows = mapRowsToInputs(
        table,
        mappingOf(table),
        resolution,
        categories,
        accounts,
        'USD',
      );
      expect(rows.map((row) => row.status)).toEqual([
        'valid',
        'error',
        'valid',
      ]);
      expect(rows[1]).toMatchObject({
        errors: ['import.rowErrors.currencyMismatch'],
      });
    });

    it('rejects overlong notes and tag overflow', () => {
      const tags = Array.from({ length: 12 }, (_, i) => `t${i}`).join(',');
      const table: ParsedCsvTable = {
        headers: [
          'Date',
          'Type',
          'Category',
          'Account',
          'Amount',
          'Note',
          'Tags',
        ],
        rows: [
          [
            '2026-09-15',
            'Expense',
            'Groceries',
            'Main Card',
            '10',
            'x'.repeat(201),
            'ok',
          ],
          ['2026-09-16', 'Expense', 'Groceries', 'Main Card', '10', '', tags],
        ],
        delimiter: ',',
        hasHeader: true,
      };
      const rows = mapRowsToInputs(
        table,
        mappingOf(table),
        resolution,
        categories,
        accounts,
        'USD',
      );
      expect(rows[0]).toMatchObject({
        status: 'error',
        errors: ['import.rowErrors.noteTooLong'],
      });
      expect(rows[1]).toMatchObject({
        status: 'error',
        errors: ['import.rowErrors.tooManyTags'],
      });
    });
  });

  describe('markDuplicates', () => {
    const table = tableOf(
      'Date,Type,Category,Account,Amount,Note\n' +
        '2026-09-15,Expense,Groceries,Main Card,10,Shop\n' +
        '2026-09-15,Expense,Groceries,Main Card,10,  SHOP  \n' +
        '2026-09-16,Expense,Groceries,Main Card,20,Other\n',
    );
    const valid = () =>
      mapRowsToInputs(
        table,
        mappingOf(table),
        resolution,
        categories,
        accounts,
        'USD',
      );

    it('flags repeats within the file and keeps the first copy', () => {
      const rows = markDuplicates(valid(), []);
      expect(rows.map((row) => row.status)).toEqual([
        'valid',
        'duplicate',
        'valid',
      ]);
      expect(rows[1]).toMatchObject({
        duplicateOf: 'file',
        excluded: true,
        errors: ['import.rowWarnings.duplicateFile'],
      });
    });

    it('flags matches against existing docs and skips error rows', () => {
      const broken: ValidatedImportRow = {
        rowNumber: 99,
        status: 'error',
        input: null,
        errors: ['import.rowErrors.dateInvalid'],
        duplicateOf: null,
        excluded: true,
      };
      const rows = markDuplicates(
        [...valid().slice(0, 1), broken],
        [
          {
            date: '2026-09-15',
            type: 'expense',
            amount: 1000,
            accountId: 'acc-card',
            categoryId: 'cat-food',
            note: 'shop',
          },
        ],
      );
      expect(rows[0]).toMatchObject({
        status: 'duplicate',
        duplicateOf: 'database',
        errors: ['import.rowWarnings.duplicateDatabase'],
      });
      expect(rows[1]?.status).toBe('error');
    });
  });

  describe('buildImportReport', () => {
    it('aggregates counts, failed chunks and affected accounts', () => {
      const rows: ValidatedImportRow[] = [
        {
          rowNumber: 1,
          status: 'valid',
          input: {
            type: 'expense',
            amount: 1000,
            accountId: 'acc-cash',
            categoryId: 'cat-food',
            date: '2026-09-15',
          },
          errors: [],
          duplicateOf: null,
          excluded: false,
        },
        {
          rowNumber: 2,
          status: 'valid',
          input: {
            type: 'expense',
            amount: 2000,
            accountId: 'acc-card',
            categoryId: 'cat-food',
            date: '2026-09-15',
          },
          errors: [],
          duplicateOf: null,
          excluded: true,
        },
        {
          rowNumber: 3,
          status: 'duplicate',
          input: null,
          errors: ['import.rowWarnings.duplicateFile'],
          duplicateOf: 'file',
          excluded: true,
        },
        {
          rowNumber: 4,
          status: 'error',
          input: null,
          errors: ['import.rowErrors.dateInvalid'],
          duplicateOf: null,
          excluded: true,
        },
      ];
      expect(
        buildImportReport(rows, [
          { chunkIndex: 0, written: 400, status: 'ok' },
          { chunkIndex: 1, written: 0, status: 'failed' },
        ]),
      ).toEqual({
        totalRows: 4,
        importedCount: 400,
        skippedErrorCount: 1,
        skippedDuplicateCount: 1,
        skippedManualCount: 1,
        failedChunks: 1,
        affectedAccounts: ['acc-cash'],
      });
    });
  });
});
