import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAccount, buildCategory } from '@/test/factories';
import type { ValidatedImportRow } from '../services/importService';
import { createFakeImporter } from '../importTestUtils';
import { ImportPreviewTable } from './ImportPreviewTable';

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.setPointerCapture = vi.fn();

describe('ImportPreviewTable', () => {
  const categories = [
    buildCategory({ id: 'cat-food', name: 'Groceries', type: 'expense' }),
  ];
  const accounts = [buildAccount({ id: 'acc-card', name: 'Main Card' })];

  const rows: ValidatedImportRow[] = [
    {
      rowNumber: 1,
      status: 'valid',
      input: {
        type: 'expense',
        amount: 12550,
        accountId: 'acc-card',
        categoryId: 'cat-food',
        date: '2026-09-15',
        note: 'Weekly shop',
      },
      errors: [],
      duplicateOf: null,
      excluded: false,
    },
    {
      rowNumber: 2,
      status: 'error',
      input: null,
      errors: ['import.rowErrors.dateInvalid'],
      duplicateOf: null,
      excluded: true,
    },
    {
      rowNumber: 3,
      status: 'duplicate',
      input: {
        type: 'expense',
        amount: 12550,
        accountId: 'acc-card',
        categoryId: 'cat-food',
        date: '2026-09-15',
        note: 'Weekly shop',
      },
      errors: ['import.rowWarnings.duplicateFile'],
      duplicateOf: 'file',
      excluded: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const previewImporter = () =>
    createFakeImporter({
      step: 'preview',
      table: {
        headers: ['Date', 'Amount'],
        rows: [
          ['2026-09-15', '125.50'],
          ['31.02.2026', '10'],
          ['2026-09-15', '125.50'],
        ],
        delimiter: ',',
        hasHeader: true,
      },
      mapping: {
        date: 0,
        type: null,
        amount: 1,
        category: null,
        account: null,
        note: null,
        tags: null,
      },
      rows,
      includedCount: 1,
      categories,
      accounts,
    });

  it('shows status counters and all rows by default', () => {
    render(<ImportPreviewTable importer={previewImporter()} currency="USD" />);

    expect(screen.getByTestId('import-counters')).toHaveTextContent(
      '1 valid · 1 errors · 1 duplicates',
    );
    expect(screen.getByTestId('import-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('import-row-2')).toBeInTheDocument();
    expect(screen.getByTestId('import-row-3')).toBeInTheDocument();
  });

  it('filters rows by status', async () => {
    const user = userEvent.setup();
    render(<ImportPreviewTable importer={previewImporter()} currency="USD" />);

    await user.click(screen.getByRole('button', { name: 'Errors' }));

    expect(screen.queryByTestId('import-row-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('import-row-2')).toBeInTheDocument();
    expect(screen.queryByTestId('import-row-3')).not.toBeInTheDocument();
  });

  it('toggles row inclusion through the checkbox', async () => {
    const user = userEvent.setup();
    const importer = previewImporter();
    render(<ImportPreviewTable importer={importer} currency="USD" />);

    const row = screen.getByTestId('import-row-1');
    const checkbox = within(row).getByRole('checkbox');
    expect(checkbox).toBeChecked();

    await user.click(checkbox);

    expect(importer.setRowExcluded).toHaveBeenCalledWith(1, true);
  });

  it('excludes all duplicates with one action', async () => {
    const user = userEvent.setup();
    const importer = previewImporter();
    render(<ImportPreviewTable importer={importer} currency="USD" />);

    await user.click(
      screen.getByRole('button', { name: /exclude duplicates/i }),
    );

    expect(importer.excludeAllByStatus).toHaveBeenCalledWith('duplicate');
  });

  it('blocks the import action offline and with zero rows', () => {
    const offline = previewImporter();
    offline.isOnline = false;
    const { unmount } = render(
      <ImportPreviewTable importer={offline} currency="USD" />,
    );
    expect(screen.getByTestId('import-start-button')).toBeDisabled();
    expect(
      screen.getByText(/reconnect to write the import/i),
    ).toBeInTheDocument();
    unmount();

    const empty = previewImporter();
    empty.rows = [];
    empty.includedCount = 0;
    render(<ImportPreviewTable importer={empty} currency="USD" />);
    expect(screen.getByTestId('import-start-button')).toBeDisabled();
  });

  it('asks for confirmation before importing 100 or more rows', async () => {
    const user = userEvent.setup();
    const importer = previewImporter();
    importer.includedCount = 120;
    render(<ImportPreviewTable importer={importer} currency="USD" />);

    await user.click(screen.getByTestId('import-start-button'));

    expect(importer.startImport).not.toHaveBeenCalled();
    expect(screen.getByText(/import 120 transactions/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /import 120/i }));

    expect(importer.startImport).toHaveBeenCalledTimes(1);
  });

  it('keeps error rows visible when nothing is importable', () => {
    const allErrors = previewImporter();
    allErrors.rows = allErrors.rows.map((row) => ({
      ...row,
      status: 'error' as const,
      input: null,
      errors: ['import.rowErrors.dateInvalid'],
      duplicateOf: null,
      excluded: true,
    }));
    allErrors.includedCount = 0;
    render(<ImportPreviewTable importer={allErrors} currency="USD" />);

    expect(screen.getByTestId('import-row-1')).toBeInTheDocument();
    expect(screen.getAllByText('Invalid date')).toHaveLength(3);
    expect(
      screen.queryByText('No valid rows to import'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('import-start-button')).toBeDisabled();
  });

  it('shows the empty state only when the file has no rows', () => {
    const empty = previewImporter();
    empty.rows = [];
    empty.includedCount = 0;
    render(<ImportPreviewTable importer={empty} currency="USD" />);

    expect(screen.getByText('No valid rows to import')).toBeInTheDocument();
    expect(screen.queryByTestId('import-row-1')).not.toBeInTheDocument();
  });

  it('notes an empty filter result instead of hiding the table', async () => {
    const user = userEvent.setup();
    const noDuplicates = previewImporter();
    noDuplicates.rows = noDuplicates.rows.filter(
      (row) => row.status !== 'duplicate',
    );
    render(<ImportPreviewTable importer={noDuplicates} currency="USD" />);

    await user.click(screen.getByRole('button', { name: 'Duplicates' }));

    expect(screen.getByText('No rows match this filter')).toBeInTheDocument();
    expect(screen.queryByTestId('import-row-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('import-counters')).toBeInTheDocument();
  });
});
