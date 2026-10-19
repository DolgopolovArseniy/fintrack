import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ROUTES } from '@/app/routes';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useFullDataExport } from '../hooks/useFullDataExport';
import { DataManagementSection } from './DataManagementSection';

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(),
}));

vi.mock('../hooks/useFullDataExport', () => ({
  useFullDataExport: vi.fn(),
}));

describe('DataManagementSection', () => {
  const mockExportData = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useOnlineStatus).mockReturnValue({ isOnline: true });
    vi.mocked(useFullDataExport).mockReturnValue({
      exportData: mockExportData,
      isExporting: false,
    });
  });

  it('renders title, description, export button, and CSV link', () => {
    render(
      <MemoryRouter>
        <DataManagementSection />
      </MemoryRouter>,
    );

    expect(screen.getByText('Data Management')).toBeInTheDocument();
    expect(screen.getByText('Full Data Export (JSON)')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Export All Data \(JSON\)/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Looking for CSV format\? Visit Import & Export/i),
    ).toBeInTheDocument();

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', ROUTES.importExport);
  });

  it('triggers exportData when export button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <DataManagementSection />
      </MemoryRouter>,
    );

    const button = screen.getByRole('button', {
      name: /Export All Data \(JSON\)/i,
    });
    await user.click(button);

    expect(mockExportData).toHaveBeenCalledTimes(1);
  });

  it('disables export button and displays spinner while isExporting is true', () => {
    vi.mocked(useFullDataExport).mockReturnValue({
      exportData: mockExportData,
      isExporting: true,
    });

    render(
      <MemoryRouter>
        <DataManagementSection />
      </MemoryRouter>,
    );

    const button = screen.getByRole('button', {
      name: /Generating export.../i,
    });
    expect(button).toBeDisabled();
  });

  it('disables export button and shows offline notice when offline', () => {
    vi.mocked(useOnlineStatus).mockReturnValue({ isOnline: false });

    render(
      <MemoryRouter>
        <DataManagementSection />
      </MemoryRouter>,
    );

    const button = screen.getByRole('button', {
      name: /Export All Data \(JSON\)/i,
    });
    expect(button).toBeDisabled();
    expect(
      screen.getByText(/This action requires an active internet connection/i),
    ).toBeInTheDocument();
  });
});
