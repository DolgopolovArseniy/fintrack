import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/features/auth';
import { AppError } from '@/lib/errors';
import { createFakeImporter } from '../importTestUtils';
import { useCsvImport } from '../hooks/useCsvImport';
import { ImportCard } from './ImportCard';

vi.mock('../hooks/useCsvImport', () => ({
  useCsvImport: vi.fn(),
}));

vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(),
}));

describe('ImportCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-1' },
      profile: { baseCurrency: 'USD' },
    } as ReturnType<typeof useAuth>);
    vi.mocked(useCsvImport).mockReturnValue(createFakeImporter());
  });

  it('renders the upload step with dropzone by default', () => {
    render(<ImportCard />);

    expect(screen.getByTestId('import-card')).toBeInTheDocument();
    expect(screen.getByTestId('import-file-input')).toBeInTheDocument();
  });

  it('passes the selected file to loadFile', () => {
    const importer = createFakeImporter();
    vi.mocked(useCsvImport).mockReturnValue(importer);
    render(<ImportCard />);

    const file = new File(['Date,Amount\n2026-09-15,10\n'], 'sample.csv', {
      type: 'text/csv',
    });
    fireEvent.change(screen.getByTestId('import-file-input'), {
      target: { files: [file] },
    });

    expect(importer.loadFile).toHaveBeenCalledTimes(1);
    expect(importer.loadFile).toHaveBeenCalledWith(file);
  });

  it('renders mapping selects on the mapping step', () => {
    vi.mocked(useCsvImport).mockReturnValue(
      createFakeImporter({
        step: 'mapping',
        table: {
          headers: ['Date', 'Amount'],
          rows: [['2026-09-15', '10']],
          delimiter: ',',
          hasHeader: true,
        },
      }),
    );
    render(<ImportCard />);

    expect(screen.getByTestId('column-map-0')).toBeInTheDocument();
    expect(screen.getByTestId('column-map-1')).toBeInTheDocument();
  });

  it('renders preview rows and report on their steps', () => {
    vi.mocked(useCsvImport).mockReturnValue(
      createFakeImporter({
        step: 'preview',
        rows: [
          {
            rowNumber: 1,
            status: 'valid',
            input: {
              type: 'expense',
              amount: 1000,
              accountId: 'acc-1',
              categoryId: 'cat-1',
              date: '2026-09-15',
            },
            errors: [],
            duplicateOf: null,
            excluded: false,
          },
        ],
        includedCount: 1,
      }),
    );
    const { unmount } = render(<ImportCard />);
    expect(screen.getByTestId('import-row-1')).toBeInTheDocument();
    unmount();

    vi.mocked(useCsvImport).mockReturnValue(
      createFakeImporter({
        step: 'result',
        report: {
          totalRows: 1,
          importedCount: 1,
          skippedErrorCount: 0,
          skippedDuplicateCount: 0,
          skippedManualCount: 0,
          failedChunks: 0,
          affectedAccounts: [],
        },
      }),
    );
    render(<ImportCard />);
    expect(screen.getByTestId('import-report')).toBeInTheDocument();
  });

  it('shows import progress on the importing step', () => {
    vi.mocked(useCsvImport).mockReturnValue(
      createFakeImporter({
        step: 'importing',
        isImporting: true,
        progress: { done: 400, total: 450 },
      }),
    );
    render(<ImportCard />);

    expect(screen.getByText('Importing 400 of 450…')).toBeInTheDocument();
  });

  it('shows a global error state with retry outside mapping', async () => {
    const importer = createFakeImporter({
      step: 'preview',
      globalError: new AppError('validation', 'import.errors.chunkFailed'),
    });
    vi.mocked(useCsvImport).mockReturnValue(importer);
    const user = userEvent.setup();
    render(<ImportCard />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /retry|повтор/i }));
    expect(importer.reset).toHaveBeenCalledTimes(1);
  });
});
