import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROUTES } from '@/app/routes';
import { AuthContext } from '../AuthContext';
import type { AuthContextValue, AuthUser } from '../types';
import { PublicOnly } from './PublicOnly';
import { RequireAuth } from './RequireAuth';
import { RootRedirect } from './RootRedirect';

const mockUser: AuthUser = {
  uid: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  providerIds: ['password'],
};

function renderWithAuth(
  initialEntries: string[],
  routes: Parameters<typeof createMemoryRouter>[0],
  authValue: Partial<AuthContextValue> & Pick<AuthContextValue, 'status'>,
) {
  const fullAuthValue: AuthContextValue = {
    user: null,
    profileStatus: authValue.status === 'loading' ? 'loading' : 'ready',
    profile: null,
    refreshUser: vi.fn().mockResolvedValue(undefined),
    refreshProfile: vi.fn().mockResolvedValue(undefined),
    ...authValue,
  } as AuthContextValue;

  const router = createMemoryRouter(routes, {
    initialEntries,
  });

  return render(
    <AuthContext.Provider value={fullAuthValue}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  );
}

describe('Auth Guards', () => {
  const mockRefreshUser = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RequireAuth', () => {
    const routes = [
      {
        element: <RequireAuth />,
        children: [
          {
            path: ROUTES.onboarding,
            element: <div data-testid="onboarding-page">Onboarding Area</div>,
          },
          {
            path: ROUTES.dashboard,
            element: <div data-testid="protected-content">Dashboard Area</div>,
          },
          {
            path: ROUTES.transactions,
            element: (
              <div data-testid="protected-content">Transactions Area</div>
            ),
          },
        ],
      },
      {
        path: ROUTES.login,
        element: <div data-testid="login-page">Login Page</div>,
      },
    ];

    it('shows loading screen while status is loading and does not render protected content', () => {
      renderWithAuth([ROUTES.dashboard], routes, {
        status: 'loading',
        refreshUser: mockRefreshUser,
      });

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('shows loading screen when authenticated but profileStatus is loading', () => {
      renderWithAuth([ROUTES.dashboard], routes, {
        status: 'authenticated',
        user: mockUser,
        profileStatus: 'loading',
        refreshUser: mockRefreshUser,
      });

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('redirects unauthenticated guest to login with safe returnTo query param', () => {
      renderWithAuth(['/app/transactions?month=2026-09'], routes, {
        status: 'unauthenticated',
        refreshUser: mockRefreshUser,
      });

      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('redirects authenticated user to /onboarding when profileStatus is needsOnboarding (AC2)', () => {
      renderWithAuth([ROUTES.dashboard], routes, {
        status: 'authenticated',
        user: mockUser,
        profileStatus: 'needsOnboarding',
        refreshUser: mockRefreshUser,
      });

      expect(screen.getByTestId('onboarding-page')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('renders onboarding route when authenticated user needs onboarding', () => {
      renderWithAuth([ROUTES.onboarding], routes, {
        status: 'authenticated',
        user: mockUser,
        profileStatus: 'needsOnboarding',
        refreshUser: mockRefreshUser,
      });

      expect(screen.getByTestId('onboarding-page')).toBeInTheDocument();
    });

    it('redirects to dashboard when user with ready profile opens /onboarding (AC3)', () => {
      renderWithAuth([ROUTES.onboarding], routes, {
        status: 'authenticated',
        user: mockUser,
        profileStatus: 'ready',
        refreshUser: mockRefreshUser,
      });

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('onboarding-page')).not.toBeInTheDocument();
    });

    it('renders protected child routes when authenticated and ready', () => {
      renderWithAuth([ROUTES.dashboard], routes, {
        status: 'authenticated',
        user: mockUser,
        profileStatus: 'ready',
        refreshUser: mockRefreshUser,
      });

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('PublicOnly', () => {
    const routes = [
      {
        element: <PublicOnly />,
        children: [
          {
            path: ROUTES.login,
            element: <div data-testid="login-page">Login Form</div>,
          },
        ],
      },
      {
        path: ROUTES.onboarding,
        element: <div data-testid="onboarding-page">Onboarding</div>,
      },
      {
        path: ROUTES.dashboard,
        element: <div data-testid="dashboard-page">Dashboard</div>,
      },
      {
        path: ROUTES.transactions,
        element: <div data-testid="transactions-page">Transactions</div>,
      },
    ];

    it('shows loading screen while status is loading', () => {
      renderWithAuth([ROUTES.login], routes, {
        status: 'loading',
        refreshUser: mockRefreshUser,
      });

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });

    it('allows unauthenticated visitors to view the route', () => {
      renderWithAuth([ROUTES.login], routes, {
        status: 'unauthenticated',
        refreshUser: mockRefreshUser,
      });

      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    it('redirects authenticated user to /onboarding if profile is missing', () => {
      renderWithAuth([ROUTES.login], routes, {
        status: 'authenticated',
        user: mockUser,
        profileStatus: 'needsOnboarding',
        refreshUser: mockRefreshUser,
      });

      expect(screen.getByTestId('onboarding-page')).toBeInTheDocument();
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });

    it('redirects authenticated user to dashboard by default', () => {
      renderWithAuth([ROUTES.login], routes, {
        status: 'authenticated',
        user: mockUser,
        profileStatus: 'ready',
        refreshUser: mockRefreshUser,
      });

      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });

    it('redirects authenticated user to safe returnTo param', () => {
      renderWithAuth(
        [`${ROUTES.login}?returnTo=%2Fapp%2Ftransactions%3Fmonth%3D2026-09`],
        routes,
        {
          status: 'authenticated',
          user: mockUser,
          profileStatus: 'ready',
          refreshUser: mockRefreshUser,
        },
      );

      expect(screen.getByTestId('transactions-page')).toBeInTheDocument();
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });
  });

  describe('RootRedirect', () => {
    const routes = [
      {
        path: ROUTES.root,
        element: <RootRedirect />,
      },
      {
        path: ROUTES.onboarding,
        element: <div data-testid="onboarding-page">Onboarding</div>,
      },
      {
        path: ROUTES.dashboard,
        element: <div data-testid="dashboard-page">Dashboard</div>,
      },
      {
        path: ROUTES.login,
        element: <div data-testid="login-page">Login Page</div>,
      },
    ];

    it('shows loading screen while status is loading', () => {
      renderWithAuth([ROUTES.root], routes, {
        status: 'loading',
        refreshUser: mockRefreshUser,
      });

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('redirects authenticated user needing onboarding to /onboarding', () => {
      renderWithAuth([ROUTES.root], routes, {
        status: 'authenticated',
        user: mockUser,
        profileStatus: 'needsOnboarding',
        refreshUser: mockRefreshUser,
      });

      expect(screen.getByTestId('onboarding-page')).toBeInTheDocument();
    });

    it('redirects authenticated user to dashboard when profile is ready', () => {
      renderWithAuth([ROUTES.root], routes, {
        status: 'authenticated',
        user: mockUser,
        profileStatus: 'ready',
        refreshUser: mockRefreshUser,
      });

      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    it('redirects guest to login', () => {
      renderWithAuth([ROUTES.root], routes, {
        status: 'unauthenticated',
        refreshUser: mockRefreshUser,
      });

      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });
});
