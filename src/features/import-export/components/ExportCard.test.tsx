import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccounts } from '@/features/accounts';
import { useCategories } from '@/features/categories';
import {
  useExportTransactions,
  type UseExportTransactionsResult,
} from '../hooks/useExportTransactions';
import type { ExportConfig } from '../schemas';
import { ExportCard } from './ExportCard';

vi.mock('../hooks/useExportTransactions', () => ({
  useExportTransactions: vi.fn(),
  resolvePresetDateRange: vi.fn(
    (preset: string, customStart?: string, customEnd?: string) => {
      if (preset === 'custom') {
        const isValid =
          Boolean(customStart && customEnd) && customStart! <= customEnd!;
        return { start: customStart ?? '', end: customEnd ?? '', isValid };
      }
      return { start: '2026-10-01', end: '2026-10-31', isValid: true };
    },
  ),
}));

vi.mock('@/features/categories', () => ({
  useCategories: vi.fn(),
  getCategoryDisplayName: vi.fn((cat: { name?: string }) => cat.name || ''),
  sortCategories: vi.fn((cats: unknown[]) => cats),
}));

vi.mock('@/features/accounts', () => ({
  useAccounts: vi.fn(),
  getAccountDisplayName: vi.fn((acc: { name?: string }) => acc.name || ''),
}));

describe('ExportCard', () => {
  const mockSetConfig = vi.fn();
  const mockExportCsv = vi.fn();

  const defaultConfig: ExportConfig = {
    preset: 'currentMonth',
    startDate: undefined,
    endDate: undefined,
    type: 'all',
    categoryId: 'all',
    accountId: 'all',
    delimiter: ',',
    includeHeaders: true,
  };

  const defaultHookReturn: UseExportTransactionsResult = {
    config: defaultConfig,
    setConfig: mockSetConfig,
    isExporting: false,
    matchingCount: 15,
    isLoadingCount: false,
    exportCsv: mockExportCsv,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useCategories).mockReturnValue({
      status: 'success',
      data: [
        {
          id: 'cat-1',
          name: 'Food',
          systemKey: undefined,
          icon: 'utensils',
          color: 'emerald',
          type: 'expense',
          archived: false,
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
      ],
      retry: vi.fn(),
    });

    vi.mocked(useAccounts).mockReturnValue({
      status: 'success',
      data: [
        {
          id: 'acc-1',
          name: 'Main Card',
          systemKey: undefined,
          type: 'card',
          balance: 100000,
          initialBalance: 100000,
          archived: false,
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
      ],
      retry: vi.fn(),
    });

    vi.mocked(useExportTransactions).mockReturnValue(defaultHookReturn);
  });

  it('renders card title, description, and export count', () => {
    render(<ExportCard />);

    expect(screen.getByTestId('export-card')).toBeInTheDocument();
    expect(screen.getByTestId('export-summary-count')).toHaveTextContent(
      /15 transaction/i,
    );
    expect(screen.getByTestId('export-submit-button')).toBeEnabled();
  });

  it('renders loading skeleton when transactions are loading', () => {
    vi.mocked(useExportTransactions).mockReturnValue({
      ...defaultHookReturn,
      isLoadingCount: true,
    });

    render(<ExportCard />);

    expect(screen.getByTestId('export-submit-button')).toBeDisabled();
    expect(
      screen
        .getByTestId('export-summary-count')
        .querySelector('[data-slot="skeleton"]'),
    ).toBeInTheDocument();
  });

  it('disables export button when no transactions match', () => {
    vi.mocked(useExportTransactions).mockReturnValue({
      ...defaultHookReturn,
      matchingCount: 0,
    });

    render(<ExportCard />);

    expect(screen.getByTestId('export-submit-button')).toBeDisabled();
    expect(screen.getByTestId('export-summary-count')).toHaveTextContent(
      /no transactions/i,
    );
  });

  it('triggers exportCsv when export button is clicked', async () => {
    const user = userEvent.setup();
    render(<ExportCard />);

    const exportBtn = screen.getByTestId('export-submit-button');
    await user.click(exportBtn);

    expect(mockExportCsv).toHaveBeenCalledTimes(1);
  });

  it('renders custom date inputs and validation error when preset is custom and dates are invalid', () => {
    vi.mocked(useExportTransactions).mockReturnValue({
      ...defaultHookReturn,
      config: {
        ...defaultConfig,
        preset: 'custom',
        startDate: '2026-05-01',
        endDate: '2026-01-01', // start > end
      },
    });

    render(<ExportCard />);

    expect(screen.getByTestId('export-start-date')).toBeInTheDocument();
    expect(screen.getByTestId('export-end-date')).toBeInTheDocument();
    expect(screen.getByTestId('date-range-error')).toBeInTheDocument();
    expect(screen.getByTestId('export-submit-button')).toBeDisabled();
  });

  it('updates custom date inputs when user types', () => {
    vi.mocked(useExportTransactions).mockReturnValue({
      ...defaultHookReturn,
      config: {
        ...defaultConfig,
        preset: 'custom',
        startDate: '2026-01-01',
        endDate: '2026-05-01',
      },
    });

    render(<ExportCard />);

    const startInput = screen.getByTestId('export-start-date');
    fireEvent.change(startInput, { target: { value: '2026-02-01' } });

    expect(mockSetConfig).toHaveBeenCalledWith({ startDate: '2026-02-01' });
  });

  it('toggles include headers switch', async () => {
    const user = userEvent.setup();
    render(<ExportCard />);

    const switchEl = screen.getByTestId('export-include-headers');
    await user.click(switchEl);

    expect(mockSetConfig).toHaveBeenCalledWith({ includeHeaders: false });
  });
});
