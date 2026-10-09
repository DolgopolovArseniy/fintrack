import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ROUTES } from '@/app/routes';
import { useAuth } from '../useAuth';
import { useSignOut } from '../useSignOut';
import type { AuthUser } from '../types';
import { UserMenu } from './UserMenu';

vi.mock('../useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../useSignOut', () => ({
  useSignOut: vi.fn(),
}));

const mockUser: AuthUser = {
  uid: 'user-123',
  email: 'john.doe@example.com',
  displayName: 'John Doe',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  providerIds: ['password'],
};

describe('UserMenu', () => {
  const signOutMock = vi.fn().mockResolvedValue(undefined);

  function mockAuthState(
    overrides: Partial<import('../types').AuthContextValue> &
      Pick<import('../types').AuthContextValue, 'status'>,
  ) {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      profileStatus: overrides.status === 'loading' ? 'loading' : 'ready',
      profile: null,
      refreshUser: vi.fn(),
      refreshProfile: vi.fn(),
      ...overrides,
    } as import('../types').AuthContextValue);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSignOut).mockReturnValue({
      signOut: signOutMock,
      isSigningOut: false,
    });
  });

  it('renders nothing when user is not authenticated', () => {
    mockAuthState({
      status: 'unauthenticated',
    });

    const { container } = render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders default variant with user initials and name', () => {
    mockAuthState({
      status: 'authenticated',
      user: mockUser,
    });

    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>,
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders compact variant with accessible button', () => {
    mockAuthState({
      status: 'authenticated',
      user: mockUser,
    });

    render(
      <MemoryRouter>
        <UserMenu variant="compact" />
      </MemoryRouter>,
    );

    const button = screen.getByRole('button', { name: /account/i });
    expect(button).toBeInTheDocument();
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('opens dropdown menu, shows settings link and triggers signOut when clicking sign out', async () => {
    const user = userEvent.setup();
    mockAuthState({
      status: 'authenticated',
      user: mockUser,
    });

    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole('button', { name: /account/i });
    await user.click(trigger);

    const settingsLink = screen.getByRole('menuitem', { name: /settings/i });
    expect(settingsLink).toBeInTheDocument();
    expect(settingsLink.closest('a')).toHaveAttribute('href', ROUTES.settings);

    const signOutButton = screen.getByRole('menuitem', { name: /sign out/i });
    expect(signOutButton).toBeInTheDocument();

    await user.click(signOutButton);
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });
});
