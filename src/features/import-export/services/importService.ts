import type { Account } from '@/features/accounts';
import { getAccountDisplayName } from '@/features/accounts';
import type { Category } from '@/features/categories';
import { getCategoryDisplayName } from '@/features/categories';
import type { TransactionInput } from '@/features/transactions';
import type { ChunkWriteResult } from '@/features/transactions';
import { transactionInputSchema } from '@/features/transactions';
import {
  buildImportDedupKey,
  normalizeImportCell,
  parseImportAmount,
  parseImportDate,
  parseImportTags,
  parseImportType,
  type ColumnMapping,
  type ParsedCsvTable,
} from '@/lib/csvImport';
import type { CurrencyCode } from '@/lib/currencies';
import { MAX_AMOUNT, NOTE_MAX_LENGTH, TAGS_MAX_COUNT } from '@/lib/limits';

export type ImportRowStatus = 'valid' | 'error' | 'duplicate';

export interface ValidatedImportRow {
  rowNumber: number; // 1-based data row number (without header)
  status: ImportRowStatus;
  input: TransactionInput | null;
  errors: string[]; // i18n keys, not raw texts
  duplicateOf: 'file' | 'database' | null;
  excluded: boolean; // errors and duplicates are excluded by default
}

export interface NameResolution {
  categoryByName: Map<string, string>;
  accountByName: Map<string, string>;
  defaultAccountId: string;
  defaultExpenseCategoryId: string;
  defaultIncomeCategoryId: string;
}

export interface ImportReportData {
  totalRows: number;
  importedCount: number;
  skippedErrorCount: number;
  skippedDuplicateCount: number;
  skippedManualCount: number;
  failedChunks: number;
  affectedAccounts: string[];
}

type NameResolutionResult = { id: string } | { errorKey: string };

interface RowMappingContext {
  mapping: ColumnMapping;
  delimiter: ParsedCsvTable['delimiter'];
  baseCurrency: CurrencyCode;
  categoriesById: Map<string, Category>;
  accountsById: Map<string, Account>;
  categoryByName: Map<string, Category>;
  accountByName: Map<string, Account>;
  overrideCategories: Map<string, string>;
  overrideAccounts: Map<string, string>;
  defaults: {
    accountId: string;
    expenseCategoryId: string;
    incomeCategoryId: string;
  };
}

const PURE_DIGITS_PATTERN = /^[0-9]+$/;

/** Pure function: raw rows + mapping + directories -> validated rows (no network). */
export function mapRowsToInputs(
  table: ParsedCsvTable,
  mapping: ColumnMapping,
  resolution: NameResolution,
  categories: readonly Category[],
  accounts: readonly Account[],
  baseCurrency: CurrencyCode,
): ValidatedImportRow[] {
  const ctx: RowMappingContext = {
    mapping,
    delimiter: table.delimiter,
    baseCurrency,
    categoriesById: new Map(categories.map((c) => [c.id, c])),
    accountsById: new Map(accounts.map((a) => [a.id, a])),
    categoryByName: buildNameLookup(categories, getCategoryDisplayName),
    accountByName: buildNameLookup(accounts, getAccountDisplayName),
    overrideCategories: normalizeOverrideMap(resolution.categoryByName),
    overrideAccounts: normalizeOverrideMap(resolution.accountByName),
    defaults: {
      accountId: resolution.defaultAccountId,
      expenseCategoryId: resolution.defaultExpenseCategoryId,
      incomeCategoryId: resolution.defaultIncomeCategoryId,
    },
  };
  return table.rows.map((row, index) => mapSingleRow(row, index + 1, ctx));
}

/** Marks duplicates within the file and against existing docs. Pure, no network. */
export function markDuplicates(
  rows: ValidatedImportRow[],
  existing: readonly {
    date: string;
    type: string;
    amount: number;
    accountId: string;
    categoryId: string;
    note?: string;
  }[],
): ValidatedImportRow[] {
  const existingKeys = new Set(
    existing.map((item) =>
      buildImportDedupKey({
        date: item.date,
        type: item.type,
        amount: item.amount,
        accountId: item.accountId,
        categoryId: item.categoryId,
        note: item.note,
      }),
    ),
  );
  const seenKeys = new Set<string>();
  return rows.map((row) => {
    if (row.status !== 'valid' || row.input === null) {
      return row;
    }
    const key = buildImportDedupKey({
      date: row.input.date,
      type: row.input.type,
      amount: row.input.amount,
      accountId: row.input.accountId,
      categoryId: row.input.categoryId,
      note: row.input.note,
    });
    if (seenKeys.has(key)) {
      return {
        ...row,
        status: 'duplicate' as const,
        duplicateOf: 'file' as const,
        excluded: true,
        errors: [...row.errors, 'import.rowWarnings.duplicateFile'],
      };
    }
    seenKeys.add(key);
    if (existingKeys.has(key)) {
      return {
        ...row,
        status: 'duplicate' as const,
        duplicateOf: 'database' as const,
        excluded: true,
        errors: [...row.errors, 'import.rowWarnings.duplicateDatabase'],
      };
    }
    return row;
  });
}

export function buildImportReport(
  rows: readonly ValidatedImportRow[],
  chunkResults: readonly ChunkWriteResult[],
): ImportReportData {
  const affectedAccounts = [
    ...new Set(
      rows.flatMap((row) =>
        row.status === 'valid' && !row.excluded && row.input !== null
          ? [row.input.accountId]
          : [],
      ),
    ),
  ].sort();
  return {
    totalRows: rows.length,
    importedCount: chunkResults
      .filter((chunk) => chunk.status === 'ok')
      .reduce((sum, chunk) => sum + chunk.written, 0),
    skippedErrorCount: rows.filter((row) => row.status === 'error').length,
    skippedDuplicateCount: rows.filter(
      (row) => row.status === 'duplicate' && row.excluded,
    ).length,
    skippedManualCount: rows.filter(
      (row) => row.status === 'valid' && row.excluded,
    ).length,
    failedChunks: chunkResults.filter((chunk) => chunk.status === 'failed')
      .length,
    affectedAccounts,
  };
}

function mapSingleRow(
  row: string[],
  rowNumber: number,
  ctx: RowMappingContext,
): ValidatedImportRow {
  const failed = (errors: string[]): ValidatedImportRow => ({
    rowNumber,
    status: 'error',
    input: null,
    errors,
    duplicateOf: null,
    excluded: true,
  });

  const rawAmount = readCell(row, ctx.mapping.amount);
  const date = parseImportDate(readCell(row, ctx.mapping.date));
  const amount = parseImportAmount(rawAmount);
  const type = resolveRowType(row, amount, ctx.mapping);

  const errors: string[] = [];
  if (date === null) {
    errors.push('import.rowErrors.dateInvalid');
  }
  if (amount === null) {
    errors.push(pickAmountErrorKey(rawAmount));
  }
  if (type === null) {
    errors.push('import.rowErrors.typeInvalid');
  }
  if (errors.length > 0 || date === null || amount === null || type === null) {
    return failed(errors);
  }

  const category = resolveCategoryId(
    readCell(row, ctx.mapping.category),
    type,
    ctx,
  );
  const account = resolveAccountId(readCell(row, ctx.mapping.account), ctx);
  if ('errorKey' in category) {
    errors.push(category.errorKey);
  }
  if ('errorKey' in account) {
    errors.push(account.errorKey);
  }
  const note = readCell(row, ctx.mapping.note);
  const tags = parseImportTags(readCell(row, ctx.mapping.tags), ctx.delimiter);
  if (note.length > NOTE_MAX_LENGTH) {
    errors.push('import.rowErrors.noteTooLong');
  }
  if (tags.length > TAGS_MAX_COUNT) {
    errors.push('import.rowErrors.tooManyTags');
  }
  if (
    !isSupportedRowCurrency(
      readCell(row, ctx.mapping.currency),
      ctx.baseCurrency,
    )
  ) {
    errors.push('import.rowErrors.currencyMismatch');
  }
  if (errors.length > 0 || 'errorKey' in category || 'errorKey' in account) {
    return failed(errors);
  }

  const candidate: TransactionInput = {
    type,
    amount: amount.minor,
    accountId: account.id,
    categoryId: category.id,
    date,
    ...(note.length > 0 ? { note } : {}),
    ...(tags.length > 0 ? { tags } : {}),
  };
  const parsed = transactionInputSchema.safeParse(candidate);
  if (!parsed.success) {
    return failed(parsed.error.issues.map(mapSchemaIssueToKey));
  }
  return {
    rowNumber,
    status: 'valid',
    input: parsed.data,
    errors: [],
    duplicateOf: null,
    excluded: false,
  };
}

function readCell(row: string[], index: number | null): string {
  if (index === null) {
    return '';
  }
  return normalizeImportCell(row[index] ?? '');
}

/** Empty cell means the base currency; anything else must match it exactly. */
function isSupportedRowCurrency(
  raw: string,
  baseCurrency: CurrencyCode,
): boolean {
  const code = normalizeImportCell(raw).toUpperCase();
  return code.length === 0 || code === baseCurrency.toUpperCase();
}

/** Mapped Type column wins; unmapped column falls back to amount sign. */
function resolveRowType(
  row: string[],
  amount: { minor: number; isNegative: boolean } | null,
  mapping: ColumnMapping,
): 'expense' | 'income' | null {
  if (mapping.type !== null) {
    return parseImportType(readCell(row, mapping.type));
  }
  if (amount === null) {
    return null;
  }
  return amount.isNegative ? 'expense' : 'income';
}

function resolveCategoryId(
  rawName: string,
  type: 'expense' | 'income',
  ctx: RowMappingContext,
): NameResolutionResult {
  const key = rawName.toLowerCase();
  if (key.length === 0) {
    const fallback = ctx.categoriesById.get(
      type === 'expense'
        ? ctx.defaults.expenseCategoryId
        : ctx.defaults.incomeCategoryId,
    );
    return fallback
      ? { id: fallback.id }
      : { errorKey: 'import.rowErrors.unknownCategory' };
  }
  const overrideId = ctx.overrideCategories.get(key);
  const entity =
    overrideId !== undefined
      ? (ctx.categoriesById.get(overrideId) ?? null)
      : (ctx.categoryByName.get(key) ?? null);
  if (entity === null) {
    return { errorKey: 'import.rowErrors.unknownCategory' };
  }
  return entity.type === type
    ? { id: entity.id }
    : { errorKey: 'import.rowErrors.categoryTypeMismatch' };
}

function resolveAccountId(
  rawName: string,
  ctx: RowMappingContext,
): NameResolutionResult {
  const key = rawName.toLowerCase();
  if (key.length === 0) {
    const fallback = ctx.accountsById.get(ctx.defaults.accountId);
    return fallback
      ? { id: fallback.id }
      : { errorKey: 'import.rowErrors.unknownAccount' };
  }
  const overrideId = ctx.overrideAccounts.get(key);
  const entity =
    overrideId !== undefined
      ? (ctx.accountsById.get(overrideId) ?? null)
      : (ctx.accountByName.get(key) ?? null);
  return entity
    ? { id: entity.id }
    : { errorKey: 'import.rowErrors.unknownAccount' };
}

/** Huge magnitudes get their own key; the rest is a plain invalid amount. */
function pickAmountErrorKey(raw: string): string {
  return isTooLargeAmount(raw)
    ? 'import.rowErrors.amountTooLarge'
    : 'import.rowErrors.amountInvalid';
}

function isTooLargeAmount(raw: string): boolean {
  const digits = normalizeImportCell(raw)
    .replace(/^[-+]/, '')
    .replace(/[\s.,'’]/g, '');
  if (!PURE_DIGITS_PATTERN.test(digits)) {
    return false;
  }
  return BigInt(`${digits.replace(/^0+/, '')}00`) > BigInt(MAX_AMOUNT);
}

function buildNameLookup<
  T extends { id: string; name?: string; systemKey?: string },
>(
  entities: readonly T[],
  displayNameOf: (entity: T) => string,
): Map<string, T> {
  const lookup = new Map<string, T>();
  for (const entity of entities) {
    for (const label of [
      entity.name,
      entity.systemKey,
      displayNameOf(entity),
    ]) {
      const key = normalizeImportCell(label ?? '').toLowerCase();
      if (key.length > 0 && !lookup.has(key)) {
        lookup.set(key, entity);
      }
    }
  }
  return lookup;
}

function normalizeOverrideMap(map: Map<string, string>): Map<string, string> {
  return new Map(
    [...map].map(([name, id]) => [normalizeImportCell(name).toLowerCase(), id]),
  );
}

function mapSchemaIssueToKey(issue: {
  path: readonly PropertyKey[];
  message: string;
}): string {
  switch (issue.path[0]) {
    case 'date':
      return 'import.rowErrors.dateInvalid';
    case 'amount':
      return issue.message.includes('TooLarge')
        ? 'import.rowErrors.amountTooLarge'
        : 'import.rowErrors.amountInvalid';
    case 'type':
      return 'import.rowErrors.typeInvalid';
    case 'note':
      return 'import.rowErrors.noteTooLong';
    case 'tags':
      return 'import.rowErrors.tooManyTags';
    case 'accountId':
      return 'import.rowErrors.unknownAccount';
    case 'categoryId':
      return 'import.rowErrors.unknownCategory';
    default:
      return issue.message;
  }
}
