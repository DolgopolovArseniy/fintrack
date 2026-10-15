import { describe, expect, it } from 'vitest';
import i18n from '@/i18n/config';
import { buildAccount, buildCategory } from '@/test/factories';
import { generateCsv } from '@/lib/csv';
import { autoMapColumns, parseCsvText } from '@/lib/csvImport';
import { buildTransactionCsvColumns } from '../services/exportService';
import {
  mapRowsToInputs,
  type NameResolution,
} from '../services/importService';
import { buildImportTemplateRows } from '../services/importTemplate';

function translateFor(lang: 'en' | 'ru') {
  return (key: string, options?: Record<string, unknown>) => {
    const fallback =
      typeof options?.defaultValue === 'string' ? options.defaultValue : key;
    return i18n.t(key, fallback, { lng: lang });
  };
}

describe('import template round-trip', () => {
  it.each(['en', 'ru'] as const)(
    'template rows resolve against default entities in %s locale',
    (lang) => {
      const t = translateFor(lang);
      const csv = generateCsv(
        buildImportTemplateRows(t),
        buildTransactionCsvColumns(t),
        { delimiter: lang === 'ru' ? ';' : ',' },
      );
      const table = parseCsvText(csv);
      const mapping = autoMapColumns(table.headers);

      expect(mapping.date).not.toBeNull();
      expect(mapping.amount).not.toBeNull();

      const categories = [
        buildCategory({
          id: 'cat-food',
          name: undefined,
          systemKey: 'food',
          type: 'expense',
        }),
        buildCategory({
          id: 'cat-salary',
          name: undefined,
          systemKey: 'salary',
          type: 'income',
        }),
      ];
      const accounts = [
        buildAccount({ id: 'acc-main', name: undefined, systemKey: 'main' }),
      ];
      const nameCandidates = (
        entity: { name?: string; systemKey?: string },
        namespace: string,
      ): string[] => {
        const names = [entity.name ?? '', entity.systemKey ?? ''];
        if (entity.systemKey) {
          names.push(
            translateFor('en')(`${namespace}.system.${entity.systemKey}`, {
              defaultValue: entity.systemKey,
            }),
            translateFor('ru')(`${namespace}.system.${entity.systemKey}`, {
              defaultValue: entity.systemKey,
            }),
          );
        }
        return names;
      };
      const toMap = (
        entities: { id: string; name?: string; systemKey?: string }[],
        namespace: string,
      ): Map<string, string> => {
        const map = new Map<string, string>();
        for (const entity of entities) {
          for (const name of nameCandidates(entity, namespace)) {
            if (name && !map.has(name)) {
              map.set(name, entity.id);
            }
          }
        }
        return map;
      };
      const resolution: NameResolution = {
        categoryByName: toMap(categories, 'categories'),
        accountByName: toMap(accounts, 'accounts'),
        defaultAccountId: 'acc-main',
        defaultExpenseCategoryId: 'cat-food',
        defaultIncomeCategoryId: 'cat-salary',
      };

      const rows = mapRowsToInputs(
        table,
        mapping,
        resolution,
        categories,
        accounts,
      );
      expect(rows).toHaveLength(2);
      for (const row of rows) {
        expect(row.status).toBe('valid');
        expect(row.errors).toEqual([]);
      }
    },
  );
});
