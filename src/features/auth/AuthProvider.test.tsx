import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '@/lib/errors';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './useAuth';
import type { AuthUser } from './types';

const { mockSubscribeToAuthState, mockReloadCurrentUser } = vi.hoisted(() => ({
  mockSubscribeToAuthState:
    vi.fn<
      (
        onUser: (user: AuthUser | null) => void,
        onError: (error: AppError) => void,
      ) => () => void
    >(),
  mockReloadCurrentUser: vi.fn<() => Promise<AuthUser | null>>(),
}));

vi.mock('./authService', () => ({
  subscribeToAuthState: mockSubscribeToAuthState,
  reloadCurrentUser: mockReloadCurrentUser,
}));

const mockUser: AuthUser = {
  uid: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  providerIds: ['password'],
};

function TestConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="status">{auth.status}</span>
      {auth.status === 'authenticated' && (
        <span data-testid="uid">{auth.user.uid}</span>
      )}
      <button
        type="button"
        onClick={() => {
          void auth.refreshUser();
        }}
      >
        Refresh
      </button>
    </div>
  );
}

describe('AuthProvider & useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws an error if useAuth is used outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      'useAuth must be used within an AuthProvider',
    );
    spy.mockRestore();
  });

  it('starts in loading status and renders children', () => {
    mockSubscribeToAuthState.mockImplementation(() => () => {});

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId('status')).toHaveTextContent('loading');
  });

  it('transitions to authenticated when user is provided', () => {
    let authCallback: ((user: AuthUser | null) => void) | null = null;
    mockSubscribeToAuthState.mockImplementation((onUser) => {
      authCallback = onUser;
      return () => {};
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId('status')).toHaveTextContent('loading');

    act(() => {
      authCallback!(mockUser);
    });

    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('uid')).toHaveTextContent('user-123');
  });

  it('transitions to unauthenticated when user is null', () => {
    let authCallback: ((user: AuthUser | null) => void) | null = null;
    mockSubscribeToAuthState.mockImplementation((onUser) => {
      authCallback = onUser;
      return () => {};
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    act(() => {
      authCallback!(null);
    });

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });

  it('transitions to unauthenticated when subscription encounters an error', () => {
    let errorCallback: ((error: AppError) => void) | null = null;
    mockSubscribeToAuthState.mockImplementation((_onUser, onError) => {
      errorCallback = onError;
      return () => {};
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    act(() => {
      errorCallback!(
        new AppError('auth/network-request-failed', 'Network error'),
      );
    });

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });

  it('unsubscribes when unmounted', () => {
    const unsubscribeMock = vi.fn<() => void>();
    mockSubscribeToAuthState.mockReturnValue(unsubscribeMock);

    const { unmount } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    expect(unsubscribeMock).not.toHaveBeenCalled();
    unmount();
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });

  it('correctly reloads user via refreshUser', async () => {
    mockSubscribeToAuthState.mockImplementation((onUser) => {
      onUser(mockUser);
      return () => {};
    });

    const refreshedUser: AuthUser = {
      ...mockUser,
      displayName: 'Updated Name',
      emailVerified: true,
    };
    mockReloadCurrentUser.mockResolvedValue(refreshedUser);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');

    await act(async () => {
      screen.getByText('Refresh').click();
      await Promise.resolve();
    });

    expect(mockReloadCurrentUser).toHaveBeenCalledTimes(1);
  });
});
