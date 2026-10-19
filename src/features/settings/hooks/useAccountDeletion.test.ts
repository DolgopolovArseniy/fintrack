import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { toast } from 'sonner';
import {
  useAuth,
  reauthenticateWithPassword,
  reauthenticateWithGoogle,
  deleteCurrentUserAccount,
} from '@/features/auth';
import { clearLocalFirestoreData } from '@/lib/firestore/session';
import { AppError } from '@/lib/errors';
import { ROUTES } from '@/app/routes';
import { deleteAllUserFirestoreData } from '../repository';
import { useAccountDeletion } from './useAccountDeletion';

const mockNavigate = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

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
  reauthenticateWithPassword: vi.fn(),
  reauthenticateWithGoogle: vi.fn(),
  deleteCurrentUserAccount: vi.fn(),
}));

vi.mock('@/lib/firestore/session', () => ({
  clearLocalFirestoreData: vi.fn(),
}));

vi.mock('../repository', () => ({
  deleteAllUserFirestoreData: vi.fn(),
}));

describe('useAccountDeletion', () => {
  const mockPasswordUser = {
    uid: 'user-delete-pwd',
    email: 'user@example.com',
    isAnonymous: false,
    providerIds: ['password'],
  };

  const mockGoogleUser = {
    uid: 'user-delete-google',
    email: 'google@example.com',
    isAnonymous: false,
    providerIds: ['google.com'],
  };

  const mockAnonUser = {
    uid: 'user-delete-anon',
    email: null,
    isAnonymous: true,
    providerIds: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('performs full deletion with password re-authentication for password user', async () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: mockPasswordUser as never,
      profileStatus: 'ready',
      profile: null,
      refreshUser: vi.fn(),
      refreshProfile: vi.fn(),
    });

    vi.mocked(reauthenticateWithPassword).mockResolvedValueOnce(undefined);
    vi.mocked(deleteAllUserFirestoreData).mockResolvedValueOnce(undefined);
    vi.mocked(deleteCurrentUserAccount).mockResolvedValueOnce(undefined);
    vi.mocked(clearLocalFirestoreData).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAccountDeletion());

    expect(result.current.isDeleting).toBe(false);
    expect(result.current.progress).toBeNull();
    expect(result.current.error).toBeNull();

    await act(async () => {
      await result.current.deleteAccount({ password: 'secret-password' });
    });

    expect(reauthenticateWithPassword).toHaveBeenCalledWith('secret-password');
    expect(reauthenticateWithGoogle).not.toHaveBeenCalled();
    expect(deleteAllUserFirestoreData).toHaveBeenCalledWith(
      'user-delete-pwd',
      expect.any(Function),
    );
    expect(deleteCurrentUserAccount).toHaveBeenCalled();
    expect(clearLocalFirestoreData).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith(
      'Your account and data have been successfully deleted',
    );
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.login, { replace: true });
    expect(result.current.isDeleting).toBe(false);
    expect(result.current.progress?.phase).toBe('done');
  });

  it('performs full deletion with Google re-authentication when requested', async () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: mockGoogleUser as never,
      profileStatus: 'ready',
      profile: null,
      refreshUser: vi.fn(),
      refreshProfile: vi.fn(),
    });

    vi.mocked(reauthenticateWithGoogle).mockResolvedValueOnce(undefined);
    vi.mocked(deleteAllUserFirestoreData).mockResolvedValueOnce(undefined);
    vi.mocked(deleteCurrentUserAccount).mockResolvedValueOnce(undefined);
    vi.mocked(clearLocalFirestoreData).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAccountDeletion());

    await act(async () => {
      await result.current.deleteAccount({ useGoogle: true });
    });

    expect(reauthenticateWithGoogle).toHaveBeenCalled();
    expect(reauthenticateWithPassword).not.toHaveBeenCalled();
    expect(deleteAllUserFirestoreData).toHaveBeenCalledWith(
      'user-delete-google',
      expect.any(Function),
    );
    expect(deleteCurrentUserAccount).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.login, { replace: true });
  });

  it('skips re-authentication for anonymous demo users', async () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: mockAnonUser as never,
      profileStatus: 'ready',
      profile: null,
      refreshUser: vi.fn(),
      refreshProfile: vi.fn(),
    });

    vi.mocked(deleteAllUserFirestoreData).mockResolvedValueOnce(undefined);
    vi.mocked(deleteCurrentUserAccount).mockResolvedValueOnce(undefined);
    vi.mocked(clearLocalFirestoreData).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAccountDeletion());

    await act(async () => {
      await result.current.deleteAccount();
    });

    expect(reauthenticateWithPassword).not.toHaveBeenCalled();
    expect(reauthenticateWithGoogle).not.toHaveBeenCalled();
    expect(deleteAllUserFirestoreData).toHaveBeenCalledWith(
      'user-delete-anon',
      expect.any(Function),
    );
    expect(deleteCurrentUserAccount).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.login, { replace: true });
  });

  it('aborts and performs zero Firestore deletions if re-auth password is incorrect', async () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: mockPasswordUser as never,
      profileStatus: 'ready',
      profile: null,
      refreshUser: vi.fn(),
      refreshProfile: vi.fn(),
    });

    const wrongPasswordError = new AppError('auth/wrong-password');
    vi.mocked(reauthenticateWithPassword).mockRejectedValueOnce(
      wrongPasswordError,
    );

    const { result } = renderHook(() => useAccountDeletion());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.deleteAccount({
        password: 'bad-password',
      });
    });

    expect(success).toBe(false);
    expect(reauthenticateWithPassword).toHaveBeenCalledWith('bad-password');
    // Critical safety invariant: zero deletions in Firestore or Auth
    expect(deleteAllUserFirestoreData).not.toHaveBeenCalled();
    expect(deleteCurrentUserAccount).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();

    expect(result.current.error).toBe('The password you entered is incorrect');
    expect(toast.error).toHaveBeenCalledWith(
      'The password you entered is incorrect',
    );
    expect(result.current.isDeleting).toBe(false);
  });

  it('aborts cleanly if Google re-auth popup is closed by user', async () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: mockGoogleUser as never,
      profileStatus: 'ready',
      profile: null,
      refreshUser: vi.fn(),
      refreshProfile: vi.fn(),
    });

    const popupClosedError = new AppError('auth/popup-closed-by-user');
    vi.mocked(reauthenticateWithGoogle).mockRejectedValueOnce(popupClosedError);

    const { result } = renderHook(() => useAccountDeletion());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.deleteAccount({ useGoogle: true });
    });

    expect(success).toBe(false);
    expect(deleteAllUserFirestoreData).not.toHaveBeenCalled();
    expect(deleteCurrentUserAccount).not.toHaveBeenCalled();
    expect(result.current.error).toBe(
      'Authentication was cancelled. Account was not deleted.',
    );
    expect(toast.error).toHaveBeenCalledWith(
      'Authentication was cancelled. Account was not deleted.',
    );
  });

  it('resets error and progress state when resetState is called', async () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: mockPasswordUser as never,
      profileStatus: 'ready',
      profile: null,
      refreshUser: vi.fn(),
      refreshProfile: vi.fn(),
    });

    vi.mocked(reauthenticateWithPassword).mockRejectedValueOnce(
      new AppError('auth/wrong-password'),
    );

    const { result } = renderHook(() => useAccountDeletion());

    await act(async () => {
      await result.current.deleteAccount({ password: 'wrong' });
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.resetState();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.progress).toBeNull();
    expect(result.current.isDeleting).toBe(false);
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

    const { result } = renderHook(() => useAccountDeletion());

    await expect(
      act(async () => {
        await result.current.deleteAccount();
      }),
    ).rejects.toThrow('Cannot delete account without authenticated user');

    expect(reauthenticateWithPassword).not.toHaveBeenCalled();
  });
});
