import { todayIso, toIsoDate } from '@/lib/dates';
import type { FullUserDataDump } from '../schemas';

export const EXPORT_APP_NAME = 'FinTrack';
export const EXPORT_DATA_VERSION = 1;

export interface RawProfileExportData {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  baseCurrency: string;
  locale: string;
  theme: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface RawAccountExportData {
  id: string;
  name?: string;
  systemKey?: string;
  type: string;
  balance: number;
  initialBalance: number;
  archived: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface RawCategoryExportData {
  id: string;
  name?: string;
  systemKey?: string;
  type: string;
  icon: string;
  color: string;
  archived: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface RawBudgetExportData {
  id: string;
  categoryId: string;
  month: string;
  limit: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface RawTransactionExportData {
  id: string;
  type: string;
  amount: number;
  accountId: string;
  categoryId: string;
  date: string;
  note?: string;
  tags?: readonly string[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface BuildFullUserDataDumpParams {
  profile: RawProfileExportData;
  accounts: readonly RawAccountExportData[];
  categories: readonly RawCategoryExportData[];
  budgets: readonly RawBudgetExportData[];
  transactions: readonly RawTransactionExportData[];
  exportedAt?: Date | string;
}

/**
 * Normalizes Date instance or ISO string to a valid ISO 8601 UTC string.
 * Throws descriptive error if the date is invalid.
 */
export function formatExportIsoDate(date: Date | string): string {
  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid Date provided for export');
    }
    return date.toISOString();
  }
  if (typeof date === 'string') {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid date string provided for export: ${date}`);
    }
    return parsed.toISOString();
  }
  throw new Error('Date must be a Date object or valid ISO string');
}

/**
 * Type guard to check if a value is already a formatted FullUserDataDump object.
 */
export function isFullUserDataDump(value: unknown): value is FullUserDataDump {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.version === 'number' &&
    typeof obj.appName === 'string' &&
    typeof obj.exportedAt === 'string' &&
    typeof obj.profile === 'object' &&
    Array.isArray(obj.accounts) &&
    Array.isArray(obj.categories) &&
    Array.isArray(obj.budgets) &&
    Array.isArray(obj.transactions)
  );
}

/**
 * Constructs a structured FullUserDataDump object from raw domain records.
 * Converts all timestamps to ISO 8601 UTC strings and cleans up optional fields.
 */
export function buildFullUserDataDump(
  params: BuildFullUserDataDumpParams,
): FullUserDataDump {
  const exportedAt = params.exportedAt
    ? formatExportIsoDate(params.exportedAt)
    : new Date().toISOString();

  return {
    version: EXPORT_DATA_VERSION,
    exportedAt,
    appName: EXPORT_APP_NAME,
    profile: {
      uid: params.profile.uid,
      email: params.profile.email ?? null,
      displayName: params.profile.displayName ?? null,
      baseCurrency: params.profile.baseCurrency,
      locale: params.profile.locale,
      theme: params.profile.theme,
      createdAt: formatExportIsoDate(params.profile.createdAt),
      updatedAt: formatExportIsoDate(params.profile.updatedAt),
    },
    accounts: params.accounts.map((acc) => {
      const item: FullUserDataDump['accounts'][number] = {
        id: acc.id,
        type: acc.type,
        balance: acc.balance,
        initialBalance: acc.initialBalance,
        archived: acc.archived,
        createdAt: formatExportIsoDate(acc.createdAt),
        updatedAt: formatExportIsoDate(acc.updatedAt),
      };
      if (acc.name !== undefined) {
        item.name = acc.name;
      }
      if (acc.systemKey !== undefined) {
        item.systemKey = acc.systemKey;
      }
      return item;
    }),
    categories: params.categories.map((cat) => {
      const item: FullUserDataDump['categories'][number] = {
        id: cat.id,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        archived: cat.archived,
        createdAt: formatExportIsoDate(cat.createdAt),
        updatedAt: formatExportIsoDate(cat.updatedAt),
      };
      if (cat.name !== undefined) {
        item.name = cat.name;
      }
      if (cat.systemKey !== undefined) {
        item.systemKey = cat.systemKey;
      }
      return item;
    }),
    budgets: params.budgets.map((b) => ({
      id: b.id,
      categoryId: b.categoryId,
      month: b.month,
      limit: b.limit,
      createdAt: formatExportIsoDate(b.createdAt),
      updatedAt: formatExportIsoDate(b.updatedAt),
    })),
    transactions: params.transactions.map((tx) => {
      const item: FullUserDataDump['transactions'][number] = {
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        accountId: tx.accountId,
        categoryId: tx.categoryId,
        date: tx.date,
        createdAt: formatExportIsoDate(tx.createdAt),
        updatedAt: formatExportIsoDate(tx.updatedAt),
      };
      if (tx.note !== undefined) {
        item.note = tx.note;
      }
      if (tx.tags !== undefined) {
        item.tags = [...tx.tags];
      }
      return item;
    }),
  };
}

/**
 * Serializes user data dump into a formatted JSON string.
 * Escapes characters per RFC 8259 JSON specification.
 */
export function generateFullDataJson(
  input: FullUserDataDump | BuildFullUserDataDumpParams,
  indent = 2,
): string {
  const dump = isFullUserDataDump(input) ? input : buildFullUserDataDump(input);
  return JSON.stringify(dump, null, indent);
}

/**
 * Generates the standardized filename for full JSON export:
 * fintrack-data-export-YYYY-MM-DD.json
 */
export function getJsonExportFilename(dateInput?: Date | string): string {
  let datePart: string;
  if (!dateInput) {
    datePart = todayIso();
  } else if (dateInput instanceof Date) {
    datePart = toIsoDate(dateInput);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    datePart = dateInput;
  } else {
    const parsed = new Date(dateInput);
    datePart = !Number.isNaN(parsed.getTime()) ? toIsoDate(parsed) : todayIso();
  }
  return `fintrack-data-export-${datePart}.json`;
}

/**
 * Triggers a browser download of the JSON dump file via a temporary Blob and hidden <a> anchor.
 */
export function downloadJsonBlob(content: string, filename: string): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  const blob = new Blob([content], {
    type: 'application/json;charset=utf-8;',
  });
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

export type { FullUserDataDump };
