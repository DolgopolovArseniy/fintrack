import { describe, expect, it, vi } from 'vitest';
import {
  generateFullDataJson,
  buildFullUserDataDump,
  formatExportIsoDate,
  getJsonExportFilename,
  downloadJsonBlob,
  isFullUserDataDump,
  EXPORT_APP_NAME,
  EXPORT_DATA_VERSION,
  type BuildFullUserDataDumpParams,
  type FullUserDataDump,
} from './exportJson';
import { fullUserDataDumpSchema } from '../schemas';

describe('exportJson utils', () => {
  const sampleParams: BuildFullUserDataDumpParams = {
    profile: {
      uid: 'user-xyz',
      email: 'user@example.com',
      displayName: 'Jane Doe',
      baseCurrency: 'USD',
      locale: 'en',
      theme: 'dark',
      createdAt: new Date('2026-01-01T10:00:00.000Z'),
      updatedAt: new Date('2026-01-02T12:00:00.000Z'),
    },
    accounts: [
      {
        id: 'acc-1',
        name: 'Main Checking',
        systemKey: 'main',
        type: 'checking',
        balance: 150000,
        initialBalance: 50000,
        archived: false,
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
        updatedAt: new Date('2026-01-02T12:00:00.000Z'),
      },
    ],
    categories: [
      {
        id: 'cat-1',
        systemKey: 'groceries',
        type: 'expense',
        icon: 'shopping-cart',
        color: 'emerald',
        archived: false,
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
        updatedAt: new Date('2026-01-02T12:00:00.000Z'),
      },
    ],
    budgets: [
      {
        id: 'budget-1',
        categoryId: 'cat-1',
        month: '2026-10',
        limit: 80000,
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
        updatedAt: new Date('2026-01-02T12:00:00.000Z'),
      },
    ],
    transactions: [
      {
        id: 'tx-1',
        type: 'expense',
        amount: 3500,
        accountId: 'acc-1',
        categoryId: 'cat-1',
        date: '2026-10-19',
        note: 'Weekly market: fruits & vegetables',
        tags: ['food', 'healthy'],
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
        updatedAt: new Date('2026-01-02T12:00:00.000Z'),
      },
    ],
    exportedAt: new Date('2026-10-19T14:30:00.000Z'),
  };

  describe('formatExportIsoDate', () => {
    it('formats Date object to ISO string', () => {
      const date = new Date('2026-05-15T08:00:00.000Z');
      expect(formatExportIsoDate(date)).toBe('2026-05-15T08:00:00.000Z');
    });

    it('normalizes valid date string to ISO string', () => {
      expect(formatExportIsoDate('2026-05-15T08:00:00.000Z')).toBe(
        '2026-05-15T08:00:00.000Z',
      );
    });

    it('throws error for invalid Date object', () => {
      expect(() => formatExportIsoDate(new Date('invalid-date'))).toThrow(
        'Invalid Date provided for export',
      );
    });

    it('throws error for invalid date string', () => {
      expect(() => formatExportIsoDate('not-a-date')).toThrow(
        'Invalid date string provided for export',
      );
    });

    it('throws error for unsupported argument types', () => {
      // @ts-expect-error Testing runtime check
      expect(() => formatExportIsoDate(12345)).toThrow(
        'Date must be a Date object or valid ISO string',
      );
    });
  });

  describe('buildFullUserDataDump', () => {
    it('constructs complete dump adhering to FullUserDataDump interface', () => {
      const dump = buildFullUserDataDump(sampleParams);

      expect(dump.version).toBe(EXPORT_DATA_VERSION);
      expect(dump.appName).toBe(EXPORT_APP_NAME);
      expect(dump.exportedAt).toBe('2026-10-19T14:30:00.000Z');
      expect(dump.profile.uid).toBe('user-xyz');
      expect(dump.profile.displayName).toBe('Jane Doe');
      expect(dump.profile.email).toBe('user@example.com');
      expect(dump.accounts).toHaveLength(1);
      expect(dump.categories).toHaveLength(1);
      expect(dump.budgets).toHaveLength(1);
      expect(dump.transactions).toHaveLength(1);

      // Validate schema compliance
      const validated = fullUserDataDumpSchema.parse(dump);
      expect(validated).toEqual(dump);
    });

    it('defaults exportedAt to current timestamp if omitted', () => {
      const paramsWithoutExportedAt: BuildFullUserDataDumpParams = {
        profile: sampleParams.profile,
        accounts: sampleParams.accounts,
        categories: sampleParams.categories,
        budgets: sampleParams.budgets,
        transactions: sampleParams.transactions,
      };
      const before = new Date().toISOString();
      const dump = buildFullUserDataDump(paramsWithoutExportedAt);
      const after = new Date().toISOString();

      expect(dump.exportedAt >= before).toBe(true);
      expect(dump.exportedAt <= after).toBe(true);
    });

    it('converts undefined displayName and email to null in profile', () => {
      const dump = buildFullUserDataDump({
        ...sampleParams,
        profile: {
          ...sampleParams.profile,
          displayName: undefined,
          email: undefined,
        },
      });

      expect(dump.profile.displayName).toBeNull();
      expect(dump.profile.email).toBeNull();
    });

    it('omits optional name, systemKey, note, tags when undefined', () => {
      const dump = buildFullUserDataDump({
        ...sampleParams,
        accounts: [
          {
            id: 'acc-bare',
            type: 'cash',
            balance: 500,
            initialBalance: 0,
            archived: false,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        categories: [
          {
            id: 'cat-bare',
            type: 'expense',
            icon: 'tag',
            color: 'slate',
            archived: false,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        transactions: [
          {
            id: 'tx-bare',
            type: 'expense',
            amount: 100,
            accountId: 'acc-bare',
            categoryId: 'cat-bare',
            date: '2026-10-19',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      });

      expect('name' in dump.accounts[0]!).toBe(false);
      expect('systemKey' in dump.accounts[0]!).toBe(false);
      expect('name' in dump.categories[0]!).toBe(false);
      expect('systemKey' in dump.categories[0]!).toBe(false);
      expect('note' in dump.transactions[0]!).toBe(false);
      expect('tags' in dump.transactions[0]!).toBe(false);
    });

    it('handles empty collections cleanly', () => {
      const dump = buildFullUserDataDump({
        profile: sampleParams.profile,
        accounts: [],
        categories: [],
        budgets: [],
        transactions: [],
        exportedAt: '2026-10-19T12:00:00.000Z',
      });

      expect(dump.accounts).toEqual([]);
      expect(dump.categories).toEqual([]);
      expect(dump.budgets).toEqual([]);
      expect(dump.transactions).toEqual([]);
      expect(fullUserDataDumpSchema.safeParse(dump).success).toBe(true);
    });
  });

  describe('generateFullDataJson', () => {
    it('serializes BuildFullUserDataDumpParams into formatted JSON string', () => {
      const json = generateFullDataJson(sampleParams);
      expect(typeof json).toBe('string');

      const parsed: unknown = JSON.parse(json);
      const validated = fullUserDataDumpSchema.parse(parsed);
      expect(validated.version).toBe(1);
      expect(validated.appName).toBe('FinTrack');
      expect(validated.profile.displayName).toBe('Jane Doe');
    });

    it('accepts pre-built FullUserDataDump directly', () => {
      const dump: FullUserDataDump = buildFullUserDataDump(sampleParams);
      const json = generateFullDataJson(dump);
      const parsed: unknown = JSON.parse(json);
      const validated = fullUserDataDumpSchema.parse(parsed);
      expect(validated).toEqual(dump);
    });

    it('safely escapes special characters, quotes, newlines, and unicode', () => {
      const specialNote =
        'Special "quoted" text with \n newline, \t tab, \\ backslash, & emoji 🚀💰🎉';
      const specialParams: BuildFullUserDataDumpParams = {
        ...sampleParams,
        transactions: [
          {
            ...sampleParams.transactions[0]!,
            note: specialNote,
          },
        ],
      };

      const json = generateFullDataJson(specialParams);
      expect(json).toContain('\\"quoted\\"');
      expect(json).toContain('\\n');

      const parsed: unknown = JSON.parse(json);
      const restored = fullUserDataDumpSchema.parse(parsed);
      expect(restored.transactions[0]?.note).toBe(specialNote);
    });

    it('respects custom indentation parameter', () => {
      const jsonIndent4 = generateFullDataJson(sampleParams, 4);
      expect(jsonIndent4).toContain('    "version": 1');

      const jsonCompact = generateFullDataJson(sampleParams, 0);
      expect(jsonCompact.startsWith('{"version":1')).toBe(true);
    });
  });

  describe('isFullUserDataDump', () => {
    it('returns true for a valid FullUserDataDump object', () => {
      const dump = buildFullUserDataDump(sampleParams);
      expect(isFullUserDataDump(dump)).toBe(true);
    });

    it('returns false for null, primitives, or incomplete objects', () => {
      expect(isFullUserDataDump(null)).toBe(false);
      expect(isFullUserDataDump('string')).toBe(false);
      expect(isFullUserDataDump({})).toBe(false);
      expect(isFullUserDataDump({ version: 1, appName: 'FinTrack' })).toBe(
        false,
      );
    });
  });

  describe('getJsonExportFilename', () => {
    it('formats filename with today date when no argument passed', () => {
      const filename = getJsonExportFilename();
      expect(filename).toMatch(
        /^fintrack-data-export-\d{4}-\d{2}-\d{2}\.json$/,
      );
    });

    it('formats filename from Date object', () => {
      const date = new Date(2026, 9, 19); // Oct 19 2026
      const filename = getJsonExportFilename(date);
      expect(filename).toBe('fintrack-data-export-2026-10-19.json');
    });

    it('formats filename from ISO string YYYY-MM-DD', () => {
      const filename = getJsonExportFilename('2026-12-31');
      expect(filename).toBe('fintrack-data-export-2026-12-31.json');
    });

    it('formats filename from full ISO datetime string', () => {
      const filename = getJsonExportFilename('2026-07-04T12:00:00.000Z');
      expect(filename).toBe('fintrack-data-export-2026-07-04.json');
    });
  });

  describe('downloadJsonBlob', () => {
    it('creates temporary anchor, triggers click, and removes it', () => {
      const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-uuid');
      const revokeObjectURLMock = vi.fn();
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => {});

      window.URL.createObjectURL = createObjectURLMock;
      window.URL.revokeObjectURL = revokeObjectURLMock;

      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      downloadJsonBlob('{"test": true}', 'fintrack-export.json');

      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      expect(appendChildSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(removeChildSpy).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-uuid');

      clickSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });
});
