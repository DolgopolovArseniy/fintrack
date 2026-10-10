import { describe, expect, it, vi } from 'vitest';
import {
  buildExportFilename,
  downloadCsvBlob,
  escapeCsvField,
  formatCsvDecimal,
  generateCsv,
  sanitizeCsvFormula,
  type CsvColumn,
} from './csv';

describe('csv domain module', () => {
  describe('sanitizeCsvFormula (AC2 & CWE-1236)', () => {
    it('prepends single quote to values starting with dangerous formula prefixes', () => {
      expect(sanitizeCsvFormula('=1+1')).toBe("'=1+1");
      expect(sanitizeCsvFormula('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(sanitizeCsvFormula('+100')).toBe("'+100");
      expect(sanitizeCsvFormula('-50')).toBe("'-50");
      expect(sanitizeCsvFormula('@SUM(1,2)')).toBe("'@SUM(1,2)");
      expect(sanitizeCsvFormula('\tcmd')).toBe("'\tcmd");
      expect(sanitizeCsvFormula('\rcmd')).toBe("'\rcmd");
      expect(sanitizeCsvFormula('%discount')).toBe("'%discount");
    });

    it('sanitizes strings with leading whitespace before dangerous prefixes', () => {
      expect(sanitizeCsvFormula('   =SUM(A1:A10)')).toBe("'   =SUM(A1:A10)");
      expect(sanitizeCsvFormula('  +200')).toBe("'  +200");
      expect(sanitizeCsvFormula(' -15')).toBe("' -15");
      expect(sanitizeCsvFormula(' @calc')).toBe("' @calc");
      expect(sanitizeCsvFormula(' %ratio')).toBe("' %ratio");
    });

    it('leaves safe strings unmodified', () => {
      expect(sanitizeCsvFormula('Groceries')).toBe('Groceries');
      expect(sanitizeCsvFormula('Salary payment')).toBe('Salary payment');
      expect(sanitizeCsvFormula('12345')).toBe('12345');
      expect(sanitizeCsvFormula('$100')).toBe('$100');
      expect(sanitizeCsvFormula('#tax')).toBe('#tax');
      expect(sanitizeCsvFormula('')).toBe('');
      // @ts-expect-error test invalid type safety fallback
      expect(sanitizeCsvFormula(null)).toBeNull();
    });

    it('does not double escape if string already starts with a single quote', () => {
      expect(sanitizeCsvFormula("'already escaped")).toBe("'already escaped");
    });
  });

  describe('escapeCsvField (RFC 4180)', () => {
    it('returns standard text without modification when no special characters are present', () => {
      expect(escapeCsvField('Groceries', ',')).toBe('Groceries');
      expect(escapeCsvField('Salary', ';')).toBe('Salary');
      expect(escapeCsvField('', ',')).toBe('');
    });

    it('wraps fields in quotes when containing the target delimiter', () => {
      expect(escapeCsvField('Coffee, Tea', ',')).toBe('"Coffee, Tea"');
      expect(escapeCsvField('Coffee, Tea', ';')).toBe('Coffee, Tea');
      expect(escapeCsvField('Coffee; Tea', ';')).toBe('"Coffee; Tea"');
    });

    it('wraps and escapes fields containing double quotes', () => {
      expect(escapeCsvField('Supermarket "Auchan"', ',')).toBe(
        '"Supermarket ""Auchan"""',
      );
      expect(escapeCsvField('He said "Hello" today', ';')).toBe(
        '"He said ""Hello"" today"',
      );
    });

    it('wraps fields containing newline or carriage return characters', () => {
      expect(escapeCsvField('Line 1\nLine 2', ',')).toBe('"Line 1\nLine 2"');
      expect(escapeCsvField('Line 1\r\nLine 2', ',')).toBe(
        '"Line 1\r\nLine 2"',
      );
    });

    it('wraps fields starting with single quote (formula sanitized fields)', () => {
      expect(escapeCsvField("'=SUM(A1:A10)", ',')).toBe('"\'=SUM(A1:A10)"');
      expect(escapeCsvField("'+1+1", ';')).toBe('"\'+1+1"');
    });

    it('handles non-string inputs gracefully', () => {
      // @ts-expect-error test runtime fallback
      expect(escapeCsvField(12345, ',')).toBe('12345');
    });
  });

  describe('formatCsvDecimal', () => {
    it('formats numbers with dot decimal separator by default', () => {
      expect(formatCsvDecimal(125.5)).toBe('125.5');
      expect(formatCsvDecimal(125.5, '.')).toBe('125.5');
      expect(formatCsvDecimal(100)).toBe('100');
      expect(formatCsvDecimal(0)).toBe('0');
      expect(formatCsvDecimal(-42.75)).toBe('-42.75');
    });

    it('formats numbers with comma decimal separator when requested', () => {
      expect(formatCsvDecimal(125.5, ',')).toBe('125,5');
      expect(formatCsvDecimal(100, ',')).toBe('100');
      expect(formatCsvDecimal(0, ',')).toBe('0');
      expect(formatCsvDecimal(-42.75, ',')).toBe('-42,75');
    });

    it('handles non-finite numbers safely', () => {
      expect(formatCsvDecimal(Number.NaN)).toBe('0');
      expect(formatCsvDecimal(Infinity)).toBe('0');
      expect(formatCsvDecimal(-Infinity)).toBe('0');
    });
  });

  describe('buildExportFilename', () => {
    it('creates filename with range label and ISO date', () => {
      expect(buildExportFilename('current-month', '2026-10-15')).toBe(
        'fintrack-export-current-month-2026-10-15.csv',
      );
      expect(buildExportFilename('2026-09', '2026-10-15')).toBe(
        'fintrack-export-2026-09-2026-10-15.csv',
      );
    });

    it('cleans special characters from range label', () => {
      expect(
        buildExportFilename('Last 3 Months / Expenses', '2026-10-15'),
      ).toBe('fintrack-export-last-3-months-expenses-2026-10-15.csv');
    });

    it('handles empty or matching range labels cleanly', () => {
      expect(buildExportFilename('', '2026-10-15')).toBe(
        'fintrack-export-2026-10-15.csv',
      );
      expect(buildExportFilename('2026-10-15', '2026-10-15')).toBe(
        'fintrack-export-2026-10-15.csv',
      );
    });

    it('falls back to today date when dateIso is omitted', () => {
      const filename = buildExportFilename('all-time');
      expect(filename).toMatch(
        /^fintrack-export-all-time-\d{4}-\d{2}-\d{2}\.csv$/,
      );
    });
  });

  describe('generateCsv (AC1, AC2, AC3)', () => {
    interface TestItem {
      date: string;
      category: string;
      amount: number;
      isIncome?: boolean;
      note?: string | null;
      tags?: string[];
    }

    const testColumns: CsvColumn<TestItem>[] = [
      { id: 'date', header: 'Date', accessor: (i) => i.date },
      { id: 'category', header: 'Category', accessor: (i) => i.category },
      { id: 'amount', header: 'Amount', accessor: (i) => i.amount },
      { id: 'note', header: 'Note', accessor: (i) => i.note },
    ];

    const testData: TestItem[] = [
      {
        date: '2026-10-01',
        category: 'Groceries, Supermarket',
        amount: 125.5,
        note: 'Weekly "mega" shopping',
      },
      {
        date: '2026-10-02',
        category: 'Salary',
        amount: 3000,
        note: '=SUM(A1:A10)', // dangerous formula injection
      },
      {
        date: '2026-10-03',
        category: 'Utilities',
        amount: 80.25,
        note: null,
      },
    ];

    it('generates RFC 4180 CSV with UTF-8 BOM, CRLF line breaks, and formula sanitization (AC1, AC2)', () => {
      const csv = generateCsv(testData, testColumns);

      // Starts with UTF-8 BOM
      expect(csv.startsWith('\uFEFF')).toBe(true);

      const content = csv.slice(1);
      const lines = content.split('\r\n');

      expect(lines).toHaveLength(4); // 1 header + 3 data rows
      expect(lines[0]).toBe('Date,Category,Amount,Note');
      expect(lines[1]).toBe(
        '2026-10-01,"Groceries, Supermarket",125.5,"Weekly ""mega"" shopping"',
      );
      // Sanitized formula "=SUM(A1:A10)" -> "'=SUM(A1:A10)" and quoted
      expect(lines[2]).toBe('2026-10-02,Salary,3000,"\'=SUM(A1:A10)"');
      // Null note formatted as empty string
      expect(lines[3]).toBe('2026-10-03,Utilities,80.25,');
    });

    it('supports semicolon delimiter and comma decimal separator for EU / RU Excel (AC3)', () => {
      const csv = generateCsv(testData, testColumns, {
        delimiter: ';',
      });

      expect(csv.startsWith('\uFEFF')).toBe(true);
      const lines = csv.slice(1).split('\r\n');

      expect(lines[0]).toBe('Date;Category;Amount;Note');
      // Delimiter is ';', comma inside category does NOT require quotes, amount has decimal comma
      expect(lines[1]).toBe(
        '2026-10-01;Groceries, Supermarket;125,5;"Weekly ""mega"" shopping"',
      );
      expect(lines[2]).toBe('2026-10-02;Salary;3000;"\'=SUM(A1:A10)"');
      expect(lines[3]).toBe('2026-10-03;Utilities;80,25;');
    });

    it('supports disabling headers and BOM', () => {
      const csv = generateCsv(testData.slice(0, 1), testColumns, {
        includeHeaders: false,
        useBom: false,
      });

      expect(csv.startsWith('\uFEFF')).toBe(false);
      expect(csv).toBe(
        '2026-10-01,"Groceries, Supermarket",125.5,"Weekly ""mega"" shopping"',
      );
    });

    it('supports disabling formula sanitization when requested', () => {
      const csv = generateCsv([testData[1]!], testColumns, {
        useBom: false,
        sanitizeFormulas: false,
      });

      const lines = csv.split('\r\n');
      expect(lines[1]).toBe('2026-10-02,Salary,3000,=SUM(A1:A10)');
    });

    it('formats boolean and complex accessor values properly', () => {
      const customCols: CsvColumn<TestItem>[] = [
        { id: 'date', header: 'Date', accessor: (i) => i.date },
        {
          id: 'isIncome',
          header: 'Income',
          accessor: (i) => i.isIncome ?? false,
        },
        { id: 'tags', header: 'Tags', accessor: (i) => i.tags?.join(',') },
      ];

      const item: TestItem = {
        date: '2026-10-05',
        category: 'Food',
        amount: 10,
        isIncome: true,
        tags: ['food', 'lunch'],
      };

      const csv = generateCsv([item], customCols, { useBom: false });
      const lines = csv.split('\r\n');
      expect(lines[0]).toBe('Date,Income,Tags');
      expect(lines[1]).toBe('2026-10-05,true,"food,lunch"');
    });

    it('handles empty dataset gracefully', () => {
      const csv = generateCsv([], testColumns, { useBom: false });
      expect(csv).toBe('Date,Category,Amount,Note');
    });

    it('handles empty columns gracefully', () => {
      const csv = generateCsv(testData, [], { useBom: false });
      expect(csv).toBe('\r\n\r\n');
    });
  });

  describe('downloadCsvBlob', () => {
    it('creates a Blob, object URL, and triggers click on a temporary link element', () => {
      const createObjectURLMock = vi
        .fn()
        .mockReturnValue('blob:http://localhost/mock-uuid');
      const revokeObjectURLMock = vi.fn();
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => {});

      window.URL.createObjectURL = createObjectURLMock;
      window.URL.revokeObjectURL = revokeObjectURLMock;

      const appendSpy = vi.spyOn(document.body, 'appendChild');
      const removeSpy = vi.spyOn(document.body, 'removeChild');

      downloadCsvBlob(
        'Date,Amount\r\n2026-10-01,100',
        'fintrack-export-2026-10.csv',
      );

      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      expect(appendSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(removeSpy).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalledWith(
        'blob:http://localhost/mock-uuid',
      );

      clickSpy.mockRestore();
      appendSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it('handles environments where URL.createObjectURL or URL.revokeObjectURL is unavailable', () => {
      const originalURL = window.URL;
      Object.defineProperty(window, 'URL', {
        value: {
          ...originalURL,
          createObjectURL: undefined,
          revokeObjectURL: undefined,
        },
        configurable: true,
        writable: true,
      });

      expect(() => {
        downloadCsvBlob('Date,Amount\r\n2026-10-01,100', 'fallback.csv');
      }).not.toThrow();

      Object.defineProperty(window, 'URL', {
        value: originalURL,
        configurable: true,
        writable: true,
      });
    });

    it('handles missing document or window environments safely', () => {
      // Verify no throw when window/document are undefined
      const originalWindow = globalThis.window;
      // @ts-expect-error simulating non-browser environment
      delete globalThis.window;

      expect(() => {
        downloadCsvBlob('content', 'file.csv');
      }).not.toThrow();

      globalThis.window = originalWindow;
    });
  });
});
