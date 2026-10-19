import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth';
import { fetchAllUserData } from '../repository';
import * as exportJsonUtils from '../utils/exportJson';
import { useFullDataExport } from './useFullDataExport';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? key,
  }),
}));

vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../repository', () => ({
  fetchAllUserData: vi.fn(),
}));

vi.mock('../utils/exportJson', async (importOriginal) => {
  const actual = await importOriginal<typeof exportJsonUtils>();
  return {
    ...actual,
    generateFullDataJson: vi.fn().mockReturnValue('{"version":1}'),
    getJsonExportFilename: vi
      .fn()
      .mockReturnValue('fintrack-data-export-2026-10-19.json'),
    downloadJsonBlob: vi.fn(),
  };
});

describe('useFullDataExport', () => {
  const mockUser = { uid: 'user-export' };
  const mockDump: exportJsonUtils.FullUserDataDump = {
    version: 1,
    appName: 'FinTrack',
    exportedAt: '2026-10-19T12:00:00.000Z',
    profile: {
      uid: 'user-export',
      email: 'test@example.com',
      displayName: 'Export User',
      baseCurrency: 'USD',
      locale: 'en',
      theme: 'system',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    accounts: [],
    categories: [],
    budgets: [],
    transactions: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: mockUser as never,
      profileStatus: 'ready',
      profile: null,
      refreshUser: vi.fn(),
      refreshProfile: vi.fn(),
    });
  });

  it('initializes with isExporting = false', () => {
    const { result } = renderHook(() => useFullDataExport());
    expect(result.current.isExporting).toBe(false);
  });

  it('executes full data export pipeline and downloads file', async () => {
    vi.mocked(fetchAllUserData).mockResolvedValueOnce(mockDump);

    const { result } = renderHook(() => useFullDataExport());

    let returnedDump: exportJsonUtils.FullUserDataDump | undefined;
    await act(async () => {
      returnedDump = await result.current.exportData();
    });

    expect(fetchAllUserData).toHaveBeenCalledWith('user-export');
    expect(exportJsonUtils.generateFullDataJson).toHaveBeenCalledWith(mockDump);
    expect(exportJsonUtils.getJsonExportFilename).toHaveBeenCalled();
    expect(exportJsonUtils.downloadJsonBlob).toHaveBeenCalledWith(
      '{"version":1}',
      'fintrack-data-export-2026-10-19.json',
    );
    expect(toast.success).toHaveBeenCalledWith(
      'Data export downloaded successfully',
    );
    expect(result.current.isExporting).toBe(false);
    expect(returnedDump).toEqual(mockDump);
  });

  it('handles fetchAllUserData error gracefully and displays error toast', async () => {
    const error = new Error('Database offline');
    vi.mocked(fetchAllUserData).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useFullDataExport());

    await expect(
      act(async () => {
        await result.current.exportData();
      }),
    ).rejects.toThrow('Database offline');

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to export data. Please try again.',
    );
    expect(exportJsonUtils.downloadJsonBlob).not.toHaveBeenCalled();
    expect(result.current.isExporting).toBe(false);
  });

  it('throws unauthenticated error when user is not logged in', async () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'unauthenticated',
      user: null,
      profileStatus: 'ready',
      profile: null,
      refreshUser: vi.fn(),
      refreshProfile: vi.fn(),
    });

    const { result } = renderHook(() => useFullDataExport());

    await expect(
      act(async () => {
        await result.current.exportData();
      }),
    ).rejects.toThrow('Cannot export data without authenticated user');

    expect(fetchAllUserData).not.toHaveBeenCalled();
  });
});
