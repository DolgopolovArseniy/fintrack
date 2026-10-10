import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccounts } from '@/features/accounts';
import { useAuth } from '@/features/auth';
import { useCategories } from '@/features/categories';
import { useExportTransactions } from '@/features/import-export';
import { ImportExportPage } from './ImportExportPage';

vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/features/import-export', async () => {
  const actual = await vi.importActual('@/features/import-export');
  return {
    ...actual,
    useExportTransactions: vi.fn(),
  };
});

vi.mock('@/features/categories', () => ({
  useCategories: vi.fn(),
  getCategoryDisplayName: vi.fn((cat: { name?: string }) => cat.name || ''),
  sortCategories: vi.fn((cats: unknown[]) => cats),
}));

vi.mock('@/features/accounts', () => ({
  useAccounts: vi.fn(),
  getAccountDisplayName: vi.fn((acc: { name?: string }) => acc.name || ''),
}));

describe('ImportExportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-1' },
      profile: { baseCurrency: 'USD' },
    } as ReturnType<typeof useAuth>);

    vi.mocked(useCategories).mockReturnValue({
      status: 'success',
      data: [],
      retry: vi.fn(),
    });

    vi.mocked(useAccounts).mockReturnValue({
      status: 'success',
      data: [],
      retry: vi.fn(),
    });

    vi.mocked(useExportTransactions).mockReturnValue({
      config: {
        preset: 'currentMonth',
        type: 'all',
        categoryId: 'all',
        accountId: 'all',
        delimiter: ',',
        includeHeaders: true,
      },
      setConfig: vi.fn(),
      isExporting: false,
      matchingCount: 5,
      isLoadingCount: false,
      exportCsv: vi.fn(),
    });
  });

  it('renders page header and tabs list', () => {
    render(<ImportExportPage />);

    expect(screen.getByTestId('import-export-page')).toBeInTheDocument();
    expect(screen.getByTestId('tab-export')).toBeInTheDocument();
    expect(screen.getByTestId('tab-import')).toBeInTheDocument();
  });

  it('renders ExportCard by default on initial render', () => {
    render(<ImportExportPage />);

    expect(screen.getByTestId('export-card')).toBeInTheDocument();
  });

  it('switches to Import tab and displays ImportPlaceholderCard with teaser badge', async () => {
    const user = userEvent.setup();
    render(<ImportExportPage />);

    const importTab = screen.getByTestId('tab-import');
    await user.click(importTab);

    expect(
      await screen.findByTestId('import-placeholder-card'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('import-badge')).toHaveTextContent(
      /coming in f10|скоро в f10/i,
    );
  });
});
