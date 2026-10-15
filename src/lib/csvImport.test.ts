import { describe, expect, it } from 'vitest';
import {
  autoMapColumns,
  buildImportDedupKey,
  normalizeImportCell,
  parseCsvText,
  parseImportAmount,
  parseImportDate,
  parseImportTags,
  parseImportType,
} from './csvImport';
import { AppError } from './errors';

describe('csvImport domain module', () => {
  describe('normalizeImportCell', () => {
    it('trims edges and collapses inner whitespace', () => {
      expect(normalizeImportCell('  Grocery   store  ')).toBe('Grocery store');
      expect(normalizeImportCell('line1\n\tline2')).toBe('line1\n line2');
    });

    it('collapses NBSP and narrow spaces', () => {
      expect(normalizeImportCell('1\u00A0250\u202F50')).toBe('1 250 50');
      expect(normalizeImportCell('\u2009 padded \u2009')).toBe('padded');
    });

    it('coerces nullish and non-string values', () => {
      expect(normalizeImportCell(null)).toBe('');
      expect(normalizeImportCell(undefined)).toBe('');
      expect(normalizeImportCell(125)).toBe('125');
    });
  });

  describe('parseCsvText', () => {
    it('parses comma-separated text with headers', () => {
      const table = parseCsvText(
        'Date,Type,Amount\n2026-09-15,Expense,125.50\n',
      );
      expect(table.delimiter).toBe(',');
      expect(table.hasHeader).toBe(true);
      expect(table.headers).toEqual(['Date', 'Type', 'Amount']);
      expect(table.rows).toEqual([['2026-09-15', 'Expense', '125.50']]);
    });

    it('detects semicolon delimiter and strips BOM', () => {
      const table = parseCsvText(
        '\uFEFFДата;Тип;Сумма\n15.09.2026;Расход;1 250,50\n',
      );
      expect(table.delimiter).toBe(';');
      expect(table.hasHeader).toBe(true);
      expect(table.headers).toEqual(['Дата', 'Тип', 'Сумма']);
      expect(table.rows).toEqual([['15.09.2026', 'Расход', '1 250,50']]);
    });

    it('respects an explicit delimiter override', () => {
      const table = parseCsvText('a;b;c\n2026-09-15;x;1\n', {
        delimiter: ';',
      });
      expect(table.delimiter).toBe(';');
      expect(table.rows).toEqual([['2026-09-15', 'x', '1']]);
    });

    it('handles quoted fields with delimiters and embedded newlines', () => {
      const table = parseCsvText(
        'Date,Note,Amount\n2026-09-15,"Coffee, with\nmilk",10\n',
      );
      expect(table.rows).toEqual([['2026-09-15', 'Coffee, with\nmilk', '10']]);
    });

    it('skips empty lines including the file tail', () => {
      const table = parseCsvText('Date,Amount\n2026-09-15,10\n\n\n');
      expect(table.rows).toHaveLength(1);
    });

    it('treats a headerless file as pure data rows', () => {
      const table = parseCsvText(
        '2026-09-15,Expense,10\n2026-09-16,Income,20\n',
      );
      expect(table.hasHeader).toBe(false);
      expect(table.headers).toEqual([]);
      expect(table.rows).toHaveLength(2);
    });

    it('throws AppError on empty or whitespace-only input', () => {
      expect(() => parseCsvText('')).toThrow(AppError);
      expect(() => parseCsvText('   \n  ')).toThrow(AppError);
    });
  });

  describe('parseImportDate', () => {
    it('accepts valid ISO dates as is', () => {
      expect(parseImportDate('2026-09-15')).toBe('2026-09-15');
      expect(parseImportDate('  2026-02-29  ')).toBe(null);
      expect(parseImportDate('2024-02-29')).toBe('2024-02-29');
    });

    it('normalizes DD.MM.YYYY to ISO', () => {
      expect(parseImportDate('15.09.2026')).toBe('2026-09-15');
      expect(parseImportDate('5.3.2026')).toBe('2026-03-05');
      expect(parseImportDate('29.02.2024')).toBe('2024-02-29');
    });

    it('rejects impossible dates and garbage', () => {
      expect(parseImportDate('31.02.2026')).toBe(null);
      expect(parseImportDate('2026-13-01')).toBe(null);
      expect(parseImportDate('2026-09-31')).toBe(null);
      expect(parseImportDate('09/15/2026')).toBe(null);
      expect(parseImportDate('tomorrow')).toBe(null);
      expect(parseImportDate('')).toBe(null);
    });
  });

  describe('parseImportAmount', () => {
    it('parses plain and grouped magnitudes', () => {
      expect(parseImportAmount('125.50')).toEqual({
        minor: 12550,
        isNegative: false,
      });
      expect(parseImportAmount('1 250,50')).toEqual({
        minor: 125050,
        isNegative: false,
      });
    });

    it('reads the sign separately from the magnitude', () => {
      expect(parseImportAmount('-125,50')).toEqual({
        minor: 12550,
        isNegative: true,
      });
      expect(parseImportAmount('+30000')).toEqual({
        minor: 3000000,
        isNegative: false,
      });
    });

    it('rejects empty, zero and garbage', () => {
      expect(parseImportAmount('')).toBe(null);
      expect(parseImportAmount('0')).toBe(null);
      expect(parseImportAmount('0,00')).toBe(null);
      expect(parseImportAmount('abc')).toBe(null);
      expect(parseImportAmount('--10')).toBe(null);
    });
  });

  describe('parseImportType', () => {
    it('maps EN and RU labels case-insensitively', () => {
      expect(parseImportType('Expense')).toBe('expense');
      expect(parseImportType('  РАСХОД ')).toBe('expense');
      expect(parseImportType('income')).toBe('income');
      expect(parseImportType('Доход')).toBe('income');
    });

    it('rejects unknown labels', () => {
      expect(parseImportType('')).toBe(null);
      expect(parseImportType('debit')).toBe(null);
      expect(parseImportType('Расходы')).toBe(null);
    });
  });

  describe('parseImportTags', () => {
    it('splits on comma and drops empties', () => {
      expect(parseImportTags('food, lunch ,,  cafe ', ',')).toEqual([
        'food',
        'lunch',
        'cafe',
      ]);
      expect(parseImportTags('', ',')).toEqual([]);
    });

    it('splits on comma even for semicolon files', () => {
      expect(parseImportTags('food, lunch', ';')).toEqual(['food', 'lunch']);
    });

    it('caps the result at TAGS_MAX_COUNT', () => {
      const raw = Array.from({ length: 15 }, (_, i) => `t${i}`).join(',');
      expect(parseImportTags(raw, ',')).toHaveLength(10);
    });
  });

  describe('autoMapColumns', () => {
    it('maps canonical EN headers', () => {
      expect(
        autoMapColumns([
          'Date',
          'Type',
          'Category',
          'Account',
          'Amount',
          'Currency',
          'Note',
          'Tags',
        ]),
      ).toEqual({
        date: 0,
        type: 1,
        amount: 4,
        category: 2,
        account: 3,
        note: 6,
        tags: 7,
      });
    });

    it('maps RU headers case-insensitively', () => {
      expect(
        autoMapColumns(['ДАТА', ' тип ', 'СУММА', 'Категория', 'Счёт']),
      ).toEqual({
        date: 0,
        type: 1,
        amount: 2,
        category: 3,
        account: 4,
        note: null,
        tags: null,
      });
    });

    it('keeps first occurrence and leaves unknown columns unmapped', () => {
      expect(autoMapColumns(['Дата', 'Date', 'Foo'])).toEqual({
        date: 0,
        type: null,
        amount: null,
        category: null,
        account: null,
        note: null,
        tags: null,
      });
    });
  });

  describe('buildImportDedupKey', () => {
    it('builds a stable pipe-joined key', () => {
      const input = {
        date: '2026-09-15',
        type: 'expense',
        amount: 12550,
        accountId: 'acc1',
        categoryId: 'cat1',
        note: 'Coffee',
      };
      expect(buildImportDedupKey(input)).toBe(
        '2026-09-15|expense|12550|acc1|cat1|coffee',
      );
    });

    it('normalizes notes so spacing and case do not fork keys', () => {
      const base = {
        date: '2026-09-15',
        type: 'expense',
        amount: 12550,
        accountId: 'acc1',
        categoryId: 'cat1',
      };
      expect(
        buildImportDedupKey({ ...base, note: '  Morning   COFFEE ' }),
      ).toBe(buildImportDedupKey({ ...base, note: 'morning coffee' }));
      expect(buildImportDedupKey({ ...base })).toBe(
        buildImportDedupKey({ ...base, note: '' }),
      );
    });
  });
});
