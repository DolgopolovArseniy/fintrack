import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth, type AuthUser, type UserProfile } from '@/features/auth';
import { SettingsPage } from './SettingsPage';

vi.mock('@/features/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/auth')>();
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

vi.mock('@/features/settings/components/ProfileSection', () => ({
  ProfileSection: () => (
    <div data-testid="mock-profile-section">ProfileSection</div>
  ),
}));

vi.mock('@/features/settings/components/PreferencesSection', () => ({
  PreferencesSection: () => (
    <div data-testid="mock-preferences-section">PreferencesSection</div>
  ),
}));

vi.mock('@/features/settings/components/DataManagementSection', () => ({
  DataManagementSection: () => (
    <div data-testid="mock-data-management-section">DataManagementSection</div>
  ),
}));

vi.mock('@/features/settings/components/DangerZoneSection', () => ({
  DangerZoneSection: () => (
    <div data-testid="mock-danger-zone-section">DangerZoneSection</div>
  ),
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

const mockProfile: UserProfile = {
  id: 'user-123',
  displayName: 'Test User',
  baseCurrency: 'USD',
  locale: 'en',
  theme: 'system',
  schemaVersion: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('SettingsPage', () => {
  const mockRefreshProfile = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders LoadingSkeleton while profile status is loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'loading',
      user: null,
      profile: null,
      profileStatus: 'loading',
      refreshUser: vi.fn(),
      refreshProfile: mockRefreshProfile,
    });

    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('settings-page')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(
      screen.queryByTestId('mock-profile-section'),
    ).not.toBeInTheDocument();
  });

  it('renders ErrorState when profileStatus is ready but profile is missing', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: mockUser,
      profile: null,
      profileStatus: 'ready',
      refreshUser: vi.fn(),
      refreshProfile: mockRefreshProfile,
    });

    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    await user.click(retryButton);
    expect(mockRefreshProfile).toHaveBeenCalledTimes(1);
  });

  it('renders all 4 settings sections when user and profile are ready', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: mockUser,
      profile: mockProfile,
      profileStatus: 'ready',
      refreshUser: vi.fn(),
      refreshProfile: mockRefreshProfile,
    });

    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('settings-page')).toBeInTheDocument();
    expect(screen.getByTestId('mock-profile-section')).toBeInTheDocument();
    expect(screen.getByTestId('mock-preferences-section')).toBeInTheDocument();
    expect(
      screen.getByTestId('mock-data-management-section'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('mock-danger-zone-section')).toBeInTheDocument();
  });

  it('renders nothing when unauthenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'unauthenticated',
      user: null,
      profile: null,
      profileStatus: 'ready',
      refreshUser: vi.fn(),
      refreshProfile: mockRefreshProfile,
    });

    const { container } = render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
