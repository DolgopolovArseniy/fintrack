import { vi } from 'vitest';
import type { UseCsvImportResult } from './hooks/useCsvImport';

/** Controllable useCsvImport stub for component tests. */
export function createFakeImporter(
  overrides?: Partial<UseCsvImportResult>,
): UseCsvImportResult {
  return {
    step: 'upload',
    table: null,
    mapping: {
      date: null,
      type: null,
      amount: null,
      currency: null,
      category: null,
      account: null,
      note: null,
      tags: null,
    },
    setMapping: vi.fn(),
    delimiter: 'auto',
    setDelimiter: vi.fn(),
    rows: [],
    includedCount: 0,
    isParsing: false,
    isImporting: false,
    progress: { done: 0, total: 0 },
    report: null,
    globalError: null,
    loadFile: vi.fn(),
    goToPreview: vi.fn(() => true),
    goToMapping: vi.fn(),
    setRowExcluded: vi.fn(),
    excludeAllByStatus: vi.fn(),
    startImport: vi.fn(),
    retryFailedChunks: vi.fn(),
    reset: vi.fn(),
    categories: [],
    accounts: [],
    defaults: { accountId: '', expenseCategoryId: '', incomeCategoryId: '' },
    setDefaultOverride: vi.fn(),
    categoryOverrides: new Map(),
    accountOverrides: new Map(),
    setNameOverride: vi.fn(),
    unmappedCategoryNames: [],
    unmappedAccountNames: [],
    isRangeTooWide: false,
    isOnline: true,
    ...overrides,
  };
}
