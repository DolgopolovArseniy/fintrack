import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ROUTES } from '@/app/routes';
import * as authService from './authService';
import * as firestoreSession from '@/lib/firestore/session';
import { useSignOut } from './useSignOut';

vi.mock('./authService', () => ({
  signOutUser: vi.fn(),
}));

vi.mock('@/lib/firestore/session', () => ({
  clearLocalFirestoreData: vi.fn(),
}));

describe('useSignOut', () => {
  const originalLocation = window.location;
  let assignMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    assignMock = vi.fn();
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: {
        ...originalLocation,
        assign: assignMock,
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: originalLocation,
    });
  });

  it('signs out user, clears local Firestore cache, and redirects with full reload to login page', async () => {
    vi.mocked(authService.signOutUser).mockResolvedValueOnce(undefined);
    vi.mocked(firestoreSession.clearLocalFirestoreData).mockResolvedValueOnce(
      undefined,
    );

    const { result } = renderHook(() => useSignOut());
    expect(result.current.isSigningOut).toBe(false);

    await act(async () => {
      await result.current.signOut();
    });

    expect(authService.signOutUser).toHaveBeenCalledTimes(1);
    expect(firestoreSession.clearLocalFirestoreData).toHaveBeenCalledTimes(1);
    expect(assignMock).toHaveBeenCalledWith(ROUTES.login);
  });

  it('still proceeds to login page if clearLocalFirestoreData rejects', async () => {
    vi.mocked(authService.signOutUser).mockResolvedValueOnce(undefined);
    vi.mocked(firestoreSession.clearLocalFirestoreData).mockRejectedValueOnce(
      new Error('Firestore terminate failed'),
    );

    const { result } = renderHook(() => useSignOut());

    await act(async () => {
      await result.current.signOut();
    });

    expect(authService.signOutUser).toHaveBeenCalledTimes(1);
    expect(firestoreSession.clearLocalFirestoreData).toHaveBeenCalledTimes(1);
    expect(assignMock).toHaveBeenCalledWith(ROUTES.login);
  });

  it('throws error and does not redirect if signOutUser fails', async () => {
    const error = new Error('Sign out failed');
    vi.mocked(authService.signOutUser).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useSignOut());

    await expect(
      act(async () => {
        await result.current.signOut();
      }),
    ).rejects.toThrow('Sign out failed');

    expect(firestoreSession.clearLocalFirestoreData).not.toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
    expect(result.current.isSigningOut).toBe(false);
  });
});
