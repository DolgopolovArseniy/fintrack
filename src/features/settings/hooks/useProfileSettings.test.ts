import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth';
import { useTheme } from '@/app/providers/ThemeProvider';
import { changeAppLanguage } from '@/i18n/config';
import { updateUserProfile } from '../repository';
import { useProfileSettings } from './useProfileSettings';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { currency?: string; defaultValue?: string }) =>
      opts?.defaultValue ?? key,
  }),
}));

vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/app/providers/ThemeProvider', () => ({
  useTheme: vi.fn(),
}));

vi.mock('@/i18n/config', () => ({
  changeAppLanguage: vi.fn(),
}));

vi.mock('../repository', () => ({
  updateUserProfile: vi.fn(),
}));

describe('useProfileSettings', () => {
  const mockUser = { uid: 'user-123' };
  const mockProfile = {
    id: 'user-123',
    baseCurrency: 'USD' as const,
    locale: 'en' as const,
    theme: 'light' as const,
    schemaVersion: 1,
    displayName: 'Current User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const refreshProfileMock = vi.fn();
  const setThemeMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: mockUser as never,
      profileStatus: 'ready',
      profile: mockProfile,
      refreshUser: vi.fn(),
      refreshProfile: refreshProfileMock,
    });

    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
      resolvedTheme: 'light',
      setTheme: setThemeMock,
    });
  });

  it('exposes initial state and profile', () => {
    const { result } = renderHook(() => useProfileSettings());

    expect(result.current.profile).toEqual(mockProfile);
    expect(result.current.isSaving).toBe(false);
  });

  it('updates display name successfully', async () => {
    vi.mocked(updateUserProfile).mockResolvedValueOnce(undefined);
    refreshProfileMock.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useProfileSettings());

    await act(async () => {
      await result.current.updateDisplayName('New Name');
    });

    expect(updateUserProfile).toHaveBeenCalledWith('user-123', {
      displayName: 'New Name',
    });
    expect(refreshProfileMock).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Profile updated successfully');
    expect(result.current.isSaving).toBe(false);
  });

  it('updates base currency successfully', async () => {
    vi.mocked(updateUserProfile).mockResolvedValueOnce(undefined);
    refreshProfileMock.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useProfileSettings());

    await act(async () => {
      await result.current.updateCurrency('EUR');
    });

    expect(updateUserProfile).toHaveBeenCalledWith('user-123', {
      baseCurrency: 'EUR',
    });
    expect(refreshProfileMock).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalled();
  });

  it('updates locale with i18n synchronization', async () => {
    vi.mocked(updateUserProfile).mockResolvedValueOnce(undefined);
    refreshProfileMock.mockResolvedValueOnce(undefined);
    vi.mocked(changeAppLanguage).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useProfileSettings());

    await act(async () => {
      await result.current.updateLocale('ru');
    });

    expect(changeAppLanguage).toHaveBeenCalledWith('ru');
    expect(updateUserProfile).toHaveBeenCalledWith('user-123', {
      locale: 'ru',
    });
    expect(refreshProfileMock).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Language changed');
  });

  it('updates theme with ThemeProvider synchronization', async () => {
    vi.mocked(updateUserProfile).mockResolvedValueOnce(undefined);
    refreshProfileMock.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useProfileSettings());

    await act(async () => {
      await result.current.updateTheme('dark');
    });

    expect(setThemeMock).toHaveBeenCalledWith('dark');
    expect(updateUserProfile).toHaveBeenCalledWith('user-123', {
      theme: 'dark',
    });
    expect(refreshProfileMock).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Theme updated');
  });

  it('handles update failure gracefully', async () => {
    const error = new Error('Network error');
    vi.mocked(updateUserProfile).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useProfileSettings());

    await expect(
      act(async () => {
        await result.current.updateDisplayName('Fail');
      }),
    ).rejects.toThrow('Network error');

    expect(toast.error).toHaveBeenCalledWith(
      'Failed to save settings. Please check your connection.',
    );
    expect(result.current.isSaving).toBe(false);
  });

  it('no-ops when user is not authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'unauthenticated',
      user: null,
      profileStatus: 'ready',
      profile: null,
      refreshUser: vi.fn(),
      refreshProfile: refreshProfileMock,
    });

    const { result } = renderHook(() => useProfileSettings());

    await act(async () => {
      await result.current.updateDisplayName('Test');
    });

    expect(updateUserProfile).not.toHaveBeenCalled();
  });
});
