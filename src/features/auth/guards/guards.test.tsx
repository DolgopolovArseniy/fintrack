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
  authValue: AuthContextValue,
) {
  const router = createMemoryRouter(routes, {
    initialEntries,
  });

  return render(
    <AuthContext.Provider value={authValue}>
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

    it('redirects unauthenticated guest to login with safe returnTo query param', () => {
      renderWithAuth(['/app/transactions?month=2026-09'], routes, {
        status: 'unauthenticated',
        refreshUser: mockRefreshUser,
      });

      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('renders protected child routes when authenticated', () => {
      renderWithAuth([ROUTES.dashboard], routes, {
        status: 'authenticated',
        user: mockUser,
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

    it('redirects authenticated user to dashboard by default', () => {
      renderWithAuth([ROUTES.login], routes, {
        status: 'authenticated',
        user: mockUser,
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

    it('redirects authenticated user to dashboard', () => {
      renderWithAuth([ROUTES.root], routes, {
        status: 'authenticated',
        user: mockUser,
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
