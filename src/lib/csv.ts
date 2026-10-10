import { todayIso } from './dates';

export type CsvDelimiter = ',' | ';';
export type CsvDecimalSeparator = '.' | ',';

export interface CsvColumn<T> {
  id: string;
  header: string;
  accessor: (item: T) => string | number | boolean | null | undefined;
}

export interface CsvExportOptions {
  delimiter?: CsvDelimiter;
  decimalSeparator?: CsvDecimalSeparator;
  includeHeaders?: boolean;
  useBom?: boolean;
  sanitizeFormulas?: boolean;
}

const DANGEROUS_FORMULA_PREFIXES = [
  '=',
  '+',
  '-',
  '@',
  '\t',
  '\r',
  '%',
] as const;

/**
 * Sanitizes dangerous formula prefixes (=, +, -, @, \t, \r, %) with a single quote prefix (')
 * to prevent CSV Formula Injection (CWE-1236) in spreadsheet applications.
 */
export function sanitizeCsvFormula(value: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    return value;
  }

  const trimmed = value.trimStart();
  const startsWithDangerous = DANGEROUS_FORMULA_PREFIXES.some(
    (prefix) => value.startsWith(prefix) || trimmed.startsWith(prefix),
  );

  if (startsWithDangerous) {
    return `'${value}`;
  }

  return value;
}

/**
 * Escapes a single CSV field value per RFC 4180 rules:
 * - If value contains the delimiter, double quotes, newline (\n, \r), or starts with single quote (formula sanitized),
 *   it is enclosed in double quotes.
 * - Internal double quotes are escaped by doubling them ("").
 */
export function escapeCsvField(value: string, delimiter: CsvDelimiter): string {
  if (typeof value !== 'string') {
    value = String(value);
  }

  const needsQuotes =
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r') ||
    value.startsWith("'");

  if (!needsQuotes) {
    return value;
  }

  const escaped = value.replaceAll('"', '""');
  return `"${escaped}"`;
}

/**
 * Formats a number for CSV output with the specified decimal separator (. or ,).
 */
export function formatCsvDecimal(
  value: number,
  decimalSeparator: CsvDecimalSeparator = '.',
): string {
  if (!Number.isFinite(value)) {
    return '0';
  }

  const str = String(value);
  if (decimalSeparator === ',') {
    return str.replace('.', ',');
  }
  return str;
}

/**
 * Builds a standardized export filename:
 * - If rangeLabel is given: fintrack-export-{rangeLabel}-{dateIso}.csv
 * - If rangeLabel is omitted or matches date: fintrack-export-{dateIso}.csv
 */
export function buildExportFilename(
  rangeLabel?: string,
  dateIso?: string,
): string {
  const date = dateIso ?? todayIso();
  const cleanRange = rangeLabel
    ? rangeLabel
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
    : '';

  if (!cleanRange || cleanRange === date) {
    return `fintrack-export-${date}.csv`;
  }

  return `fintrack-export-${cleanRange}-${date}.csv`;
}

/**
 * Generates an RFC 4180 compliant CSV string from an array of items and column definitions.
 * Supports delimiters (, or ;), decimal separators, UTF-8 BOM, formula sanitization, and CRLF line breaks.
 */
export function generateCsv<T>(
  data: readonly T[],
  columns: readonly CsvColumn<T>[],
  options?: CsvExportOptions,
): string {
  const delimiter = options?.delimiter ?? ',';
  const decimalSeparator =
    options?.decimalSeparator ?? (delimiter === ';' ? ',' : '.');
  const includeHeaders = options?.includeHeaders ?? true;
  const useBom = options?.useBom ?? true;
  const sanitizeFormulas = options?.sanitizeFormulas ?? true;

  const rows: string[] = [];

  // 1. Column headers
  if (includeHeaders && columns.length > 0) {
    const headerRow = columns
      .map((col) => escapeCsvField(col.header, delimiter))
      .join(delimiter);
    rows.push(headerRow);
  }

  // 2. Data rows
  for (const item of data) {
    const cells: string[] = [];

    for (const column of columns) {
      const rawValue = column.accessor(item);

      let formatted: string;
      if (rawValue === null || rawValue === undefined) {
        formatted = '';
      } else if (typeof rawValue === 'number') {
        formatted = formatCsvDecimal(rawValue, decimalSeparator);
      } else if (typeof rawValue === 'boolean') {
        formatted = String(rawValue);
      } else if (typeof rawValue === 'string') {
        formatted = rawValue;
      } else {
        formatted = String(rawValue);
      }

      if (
        sanitizeFormulas &&
        typeof rawValue === 'string' &&
        formatted.length > 0
      ) {
        formatted = sanitizeCsvFormula(formatted);
      }

      cells.push(escapeCsvField(formatted, delimiter));
    }

    rows.push(cells.join(delimiter));
  }

  const csvBody = rows.join('\r\n');
  return useBom ? `\uFEFF${csvBody}` : csvBody;
}

/**
 * Initiates downloading a CSV file in the browser using a temporary Blob and <a> element.
 */
export function downloadCsvBlob(content: string, filename: string): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url =
    typeof window.URL?.createObjectURL === 'function'
      ? window.URL.createObjectURL(blob)
      : '';

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (url && typeof window.URL?.revokeObjectURL === 'function') {
    window.URL.revokeObjectURL(url);
  }
}
