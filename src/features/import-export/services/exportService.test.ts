import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';
import type { Account } from '@/features/accounts';
import type { Category } from '@/features/categories';
import type { Transaction } from '@/features/transactions';
import {
  buildTransactionCsvColumns,
  transformTransactionsToCsv,
  type ExportRow,
} from './exportService';

describe('exportService', () => {
  const mockT = ((key: string, options?: { defaultValue?: string }) => {
    const translations: Record<string, string> = {
      'importExport.export.columns.date': 'Date',
      'importExport.export.columns.type': 'Type',
      'importExport.export.columns.category': 'Category',
      'importExport.export.columns.account': 'Account',
      'importExport.export.columns.amount': 'Amount',
      'importExport.export.columns.currency': 'Currency',
      'importExport.export.columns.note': 'Note',
      'importExport.export.columns.tags': 'Tags',
      'importExport.export.columns.expenseType': 'Expense',
      'importExport.export.columns.incomeType': 'Income',
      'categories.system.groceries': 'Groceries',
      'accounts.system.main': 'Main account',
    };
    return translations[key] ?? options?.defaultValue ?? key;
  }) as unknown as TFunction;

  const mockCategories: Category[] = [
    {
      id: 'cat-groceries',
      name: '',
      systemKey: 'groceries',
      icon: 'shopping-cart',
      color: 'emerald',
      type: 'expense',
      archived: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    {
      id: 'cat-custom-active',
      name: 'Custom Active',
      systemKey: undefined,
      icon: 'tag',
      color: 'sky',
      type: 'expense',
      archived: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    {
      id: 'cat-archived',
      name: 'Old Category',
      systemKey: undefined,
      icon: 'archive',
      color: 'slate',
      type: 'expense',
      archived: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
  ];

  const mockAccounts: Account[] = [
    {
      id: 'acc-main',
      name: '',
      systemKey: 'main',
      type: 'card',
      balance: 100000,
      initialBalance: 100000,
      archived: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    {
      id: 'acc-archived',
      name: 'Old Wallet',
      systemKey: undefined,
      type: 'cash',
      balance: 0,
      initialBalance: 0,
      archived: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
  ];

  const mockTransactions: Transaction[] = [
    {
      id: 'tx-1',
      date: '2026-10-15',
      type: 'expense',
      categoryId: 'cat-groceries',
      accountId: 'acc-main',
      amount: 12550, // 125.50
      note: 'Weekly shopping',
      tags: ['food', 'supermarket'],
      createdAt: new Date('2026-10-15T10:00:00Z'),
      updatedAt: new Date('2026-10-15T10:00:00Z'),
    },
    {
      id: 'tx-2',
      date: '2026-10-16',
      type: 'income',
      categoryId: 'cat-custom-active',
      accountId: 'acc-main',
      amount: 500000, // 5000.00
      note: '=SUM(1,2)', // formula injection
      tags: [],
      createdAt: new Date('2026-10-16T12:00:00Z'),
      updatedAt: new Date('2026-10-16T12:00:00Z'),
    },
    {
      id: 'tx-3',
      date: '2026-10-17',
      type: 'expense',
      categoryId: 'cat-archived',
      accountId: 'acc-archived',
      amount: 4200, // 42.00
      createdAt: new Date('2026-10-17T14:00:00Z'),
      updatedAt: new Date('2026-10-17T14:00:00Z'),
    },
    {
      id: 'tx-4',
      date: '2026-10-18',
      type: 'expense',
      categoryId: 'non-existent-cat',
      accountId: 'non-existent-acc',
      amount: 1000, // 10.00
      createdAt: new Date('2026-10-18T16:00:00Z'),
      updatedAt: new Date('2026-10-18T16:00:00Z'),
    },
  ];

  describe('buildTransactionCsvColumns', () => {
    it('constructs 8 standard columns with translated headers and working accessors', () => {
      const columns = buildTransactionCsvColumns(mockT);
      expect(columns).toHaveLength(8);

      const row: ExportRow = {
        date: '2026-10-15',
        type: 'Expense',
        category: 'Groceries',
        account: 'Main account',
        amount: 125.5,
        currency: 'USD',
        note: 'Note text',
        tags: 'tag1, tag2',
      };

      expect(columns.map((c) => c.header)).toEqual([
        'Date',
        'Type',
        'Category',
        'Account',
        'Amount',
        'Currency',
        'Note',
        'Tags',
      ]);

      expect(columns.map((c) => c.accessor(row))).toEqual([
        '2026-10-15',
        'Expense',
        'Groceries',
        'Main account',
        125.5,
        'USD',
        'Note text',
        'tag1, tag2',
      ]);
    });
  });

  describe('transformTransactionsToCsv', () => {
    it('transforms transactions into RFC 4180 CSV with UTF-8 BOM', () => {
      const csv = transformTransactionsToCsv({
        transactions: mockTransactions,
        categories: mockCategories,
        accounts: mockAccounts,
        baseCurrency: 'USD',
        t: mockT,
      });

      expect(csv.startsWith('\uFEFF')).toBe(true);

      const content = csv.slice(1);
      const lines = content.split('\r\n');

      expect(lines).toHaveLength(5); // 1 header + 4 data rows
      expect(lines[0]).toBe(
        'Date,Type,Category,Account,Amount,Currency,Note,Tags',
      );

      // Row 1: system category Groceries, system account Main account, tags joined
      expect(lines[1]).toBe(
        '2026-10-15,Expense,Groceries,Main account,125.5,USD,Weekly shopping,"food, supermarket"',
      );

      // Row 2: Income, sanitized formula '=SUM(1,2)'
      expect(lines[2]).toBe(
        '2026-10-16,Income,Custom Active,Main account,5000,USD,"\'=SUM(1,2)",',
      );

      // Row 3: Archived category & account with (archived) suffix
      expect(lines[3]).toBe(
        '2026-10-17,Expense,Old Category (archived),Old Wallet (archived),42,USD,,',
      );

      // Row 4: Unknown / deleted entities fallback
      expect(lines[4]).toBe(
        '2026-10-18,Expense,[Deleted / Unknown],[Deleted / Unknown],10,USD,,',
      );
    });

    it('supports semicolon delimiter and localized decimal format for European / RU Excel', () => {
      const csv = transformTransactionsToCsv({
        transactions: [mockTransactions[0]!],
        categories: mockCategories,
        accounts: mockAccounts,
        baseCurrency: 'EUR',
        t: mockT,
        options: { delimiter: ';' },
      });

      expect(csv.startsWith('\uFEFF')).toBe(true);
      const lines = csv.slice(1).split('\r\n');

      expect(lines[0]).toBe(
        'Date;Type;Category;Account;Amount;Currency;Note;Tags',
      );
      expect(lines[1]).toBe(
        '2026-10-15;Expense;Groceries;Main account;125,5;EUR;Weekly shopping;food, supermarket',
      );
    });
  });
});
