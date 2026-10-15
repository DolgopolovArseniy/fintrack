import Papa from 'papaparse';
import type { CsvDelimiter } from './csv';
import { isValidIsoDate } from './dates';
import { AppError } from './errors';
import { parseMoneyInput } from './money';

export const IMPORTABLE_FIELDS = [
  'date',
  'type',
  'amount',
  'category',
  'account',
  'note',
  'tags',
] as const;
export type ImportField = (typeof IMPORTABLE_FIELDS)[number];

export type ColumnMapping = Record<ImportField, number | null>;

export interface ParsedCsvTable {
  headers: string[];
  rows: string[][];
  delimiter: CsvDelimiter;
  hasHeader: boolean;
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const RU_DATE_PATTERN = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
// Non-breaking and narrow spaces that \s may miss plus Swiss apostrophes.
const INVISIBLE_SPACE_PATTERN = /[\u00A0\u202F\u2009\u200B\u2019\u0027]+/g;

/** Canonical F09 export headers (EN + RU) per importable field. */
const HEADER_DICTIONARY: Record<ImportField, readonly string[]> = {
  date: ['date', 'дата'],
  type: ['type', 'тип'],
  amount: ['amount', 'сумма'],
  category: ['category', 'категория'],
  account: ['account', 'счёт', 'счет'],
  note: ['note', 'заметка'],
  tags: ['tags', 'теги'],
};

/**
 * Strips BOM, detects `,` vs `;` and parses CSV text via PapaParse.
 * Assumes the file has a date column (mapping requires it), so a first row
 * without any date-like cell is treated as a header row.
 * Throws AppError('validation') on empty or unreadable input.
 */
export function parseCsvText(
  text: string,
  opts?: { delimiter?: CsvDelimiter },
): ParsedCsvTable {
  const withoutBom =
    typeof text === 'string' ? text.replace(/^\uFEFF+/u, '') : '';
  if (withoutBom.trim().length === 0) {
    throw new AppError('validation', 'Empty CSV text');
  }

  const results = Papa.parse<string[]>(withoutBom, {
    delimiter: opts?.delimiter,
    delimitersToGuess: [',', ';'],
    skipEmptyLines: 'greedy',
    header: false,
  });

  const data = results.data
    .filter((row): row is string[] => Array.isArray(row))
    .map((row) => row.map((cell) => normalizeImportCell(cell)))
    .filter((row) => row.length > 0);

  if (data.length === 0) {
    const detail = results.errors[0]?.message ?? 'No data rows found';
    throw new AppError('validation', `Cannot parse CSV: ${detail}`);
  }

  const delimiter: CsvDelimiter =
    opts?.delimiter ?? (results.meta.delimiter === ';' ? ';' : ',');
  const firstRow = data[0]!;
  const hasHeader = !firstRow.some((cell) => parseImportDate(cell) !== null);

  return {
    headers: hasHeader ? firstRow : [],
    rows: hasHeader ? data.slice(1) : data,
    delimiter,
    hasHeader,
  };
}

/** Trims edges and collapses inner spaces/tabs (incl. NBSP variants, not newlines). */
export function normalizeImportCell(value: unknown): string {
  if (typeof value === 'string') {
    return value
      .replace(INVISIBLE_SPACE_PATTERN, ' ')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }
  return '';
}

/** 'YYYY-MM-DD' as is; 'DD.MM.YYYY' normalized to ISO; otherwise null. */
export function parseImportDate(raw: string): string | null {
  const value = normalizeImportCell(raw);
  if (value.length === 0) {
    return null;
  }

  const isoMatch = ISO_DATE_PATTERN.exec(value);
  if (isoMatch) {
    return isValidIsoDate(value) ? value : null;
  }

  const ruMatch = RU_DATE_PATTERN.exec(value);
  if (!ruMatch) {
    return null;
  }
  const iso = `${ruMatch[3]}-${ruMatch[2]!.padStart(2, '0')}-${ruMatch[1]!.padStart(2, '0')}`;
  return isValidIsoDate(iso) ? iso : null;
}

/**
 * Sign is read separately, magnitude goes through parseMoneyInput (which
 * rejects signs). Zero and empty are null: a transaction amount starts at 1.
 */
export function parseImportAmount(
  raw: string,
): { minor: number; isNegative: boolean } | null {
  const value = normalizeImportCell(raw);
  if (value.length === 0) {
    return null;
  }
  const isNegative = value.startsWith('-');
  const unsigned =
    value.startsWith('-') || value.startsWith('+') ? value.slice(1) : value;
  const minor = parseMoneyInput(unsigned);
  if (minor === null || minor === 0) {
    return null;
  }
  return { minor, isNegative };
}

/** Export labels on both locales (trim, case-insensitive); otherwise null. */
export function parseImportType(raw: string): 'expense' | 'income' | null {
  const value = normalizeImportCell(raw).toLowerCase();
  if (value === 'expense' || value === 'расход') {
    return 'expense';
  }
  if (value === 'income' || value === 'доход') {
    return 'income';
  }
  return null;
}

/**
 * Splits on canonical comma (export joins tags with ', ' regardless of
 * the column delimiter). Never truncates: tag overflow is a row error
 * handled by the import service, not a silent trim.
 */
export function parseImportTags(
  raw: string,
  delimiter: CsvDelimiter,
): string[] {
  void delimiter;
  const value = normalizeImportCell(raw);
  if (value.length === 0) {
    return [];
  }
  return value
    .split(',')
    .map((tag) => normalizeImportCell(tag))
    .filter((tag) => tag.length > 0);
}

/** Maps EN+RU headers to fields; first occurrence wins, the rest stay null. */
export function autoMapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    date: null,
    type: null,
    amount: null,
    category: null,
    account: null,
    note: null,
    tags: null,
  };
  const lookup = new Map<string, ImportField>();
  for (const field of IMPORTABLE_FIELDS) {
    for (const label of HEADER_DICTIONARY[field]) {
      if (!lookup.has(label)) {
        lookup.set(label, field);
      }
    }
  }
  headers.forEach((header, index) => {
    const field = lookup.get(normalizeImportCell(header).toLowerCase());
    if (field !== undefined && mapping[field] === null) {
      mapping[field] = index;
    }
  });
  return mapping;
}

/** Normalized dedup key: note is trimmed, whitespace-collapsed, lower-cased. */
export function buildImportDedupKey(input: {
  date: string;
  type: string;
  amount: number;
  accountId: string;
  categoryId: string;
  note?: string;
}): string {
  const note = normalizeImportCell(input.note ?? '').toLowerCase();
  return `${input.date}|${input.type}|${input.amount}|${input.accountId}|${input.categoryId}|${note}`;
}
