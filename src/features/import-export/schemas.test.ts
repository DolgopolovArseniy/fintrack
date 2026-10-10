import { describe, expect, it } from 'vitest';
import {
  csvDelimiterSchema,
  exportConfigSchema,
  exportScopePresetSchema,
  EXPORT_SCOPE_PRESETS,
} from './schemas';

describe('import-export schemas', () => {
  describe('exportScopePresetSchema', () => {
    it('accepts all valid presets', () => {
      for (const preset of EXPORT_SCOPE_PRESETS) {
        expect(exportScopePresetSchema.parse(preset)).toBe(preset);
      }
    });

    it('rejects invalid presets', () => {
      expect(() => exportScopePresetSchema.parse('nextMonth')).toThrow();
      expect(() => exportScopePresetSchema.parse('')).toThrow();
      expect(() => exportScopePresetSchema.parse(123)).toThrow();
    });
  });

  describe('csvDelimiterSchema', () => {
    it('accepts comma and semicolon delimiters', () => {
      expect(csvDelimiterSchema.parse(',')).toBe(',');
      expect(csvDelimiterSchema.parse(';')).toBe(';');
    });

    it('rejects unsupported delimiters', () => {
      expect(() => csvDelimiterSchema.parse('\t')).toThrow();
      expect(() => csvDelimiterSchema.parse('|')).toThrow();
    });
  });

  describe('exportConfigSchema', () => {
    it('applies default values when only preset is provided', () => {
      const parsed = exportConfigSchema.parse({ preset: 'currentMonth' });
      expect(parsed).toEqual({
        preset: 'currentMonth',
        type: 'all',
        categoryId: 'all',
        accountId: 'all',
        delimiter: ',',
        includeHeaders: true,
      });
    });

    it('parses full custom export configuration', () => {
      const fullConfig = {
        preset: 'custom' as const,
        startDate: '2026-01-01',
        endDate: '2026-06-30',
        type: 'expense' as const,
        categoryId: 'cat-groceries',
        accountId: 'acc-card',
        delimiter: ';' as const,
        includeHeaders: false,
      };

      const parsed = exportConfigSchema.parse(fullConfig);
      expect(parsed).toEqual(fullConfig);
    });

    it('rejects invalid ISO dates in startDate or endDate', () => {
      expect(() =>
        exportConfigSchema.parse({
          preset: 'custom',
          startDate: 'invalid-date',
          endDate: '2026-06-30',
        }),
      ).toThrow();

      expect(() =>
        exportConfigSchema.parse({
          preset: 'custom',
          startDate: '2026-01-01',
          endDate: '2026-13-45',
        }),
      ).toThrow();
    });

    it('rejects invalid transaction type filter', () => {
      expect(() =>
        exportConfigSchema.parse({
          preset: 'currentMonth',
          type: 'transfer',
        }),
      ).toThrow();
    });
  });
});
