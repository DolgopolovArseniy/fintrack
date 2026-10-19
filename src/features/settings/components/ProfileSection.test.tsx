import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuth } from '@/features/auth';
import type { AuthUser, UserProfile } from '@/features/auth';
import { useProfileSettings } from '../hooks/useProfileSettings';
import { ProfileSection } from './ProfileSection';

vi.mock('@/features/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/auth')>();
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

vi.mock('../hooks/useProfileSettings', () => ({
  useProfileSettings: vi.fn(),
}));

const mockUser: AuthUser = {
  uid: 'user-123',
  email: 'test@example.com',
  displayName: 'John Doe',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  providerIds: ['password'],
};

const mockProfile: UserProfile = {
  id: 'user-123',
  displayName: 'John Doe',
  baseCurrency: 'USD',
  locale: 'en',
  theme: 'system',
  schemaVersion: 1,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

describe('ProfileSection', () => {
  const mockUpdateDisplayName = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProfileSettings).mockReturnValue({
      profile: mockProfile,
      isSaving: false,
      updateDisplayName: mockUpdateDisplayName,
      updateCurrency: vi.fn(),
      updateLocale: vi.fn(),
      updateTheme: vi.fn(),
    });

    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: mockUser,
      profile: mockProfile,
      profileStatus: 'ready',
      refreshUser: vi.fn(),
      refreshProfile: vi.fn(),
    });
  });

  it('renders nothing when user is null', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'unauthenticated',
      user: null,
      profile: null,
      profileStatus: 'ready',
      refreshUser: vi.fn(),
      refreshProfile: vi.fn(),
    });

    const { container } = render(<ProfileSection />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders user details, verified badge, and current display name', () => {
    render(<ProfileSection />);

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Save Changes/i }),
    ).toBeInTheDocument();
  });

  it('renders unverified badge when email is not verified', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: { ...mockUser, emailVerified: false },
      profile: mockProfile,
      profileStatus: 'ready',
      refreshUser: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(<ProfileSection />);
    expect(screen.getByText('Unverified')).toBeInTheDocument();
  });

  it('renders demo badge for anonymous user', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: { ...mockUser, isAnonymous: true, email: null },
      profile: mockProfile,
      profileStatus: 'ready',
      refreshUser: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(<ProfileSection />);
    expect(screen.getByText('Demo')).toBeInTheDocument();
  });

  it('submits updated display name on form submission', async () => {
    const user = userEvent.setup();
    render(<ProfileSection />);

    const input = screen.getByDisplayValue('John Doe');
    await user.clear(input);
    await user.type(input, 'Jane Doe');

    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    expect(saveButton).toBeEnabled();

    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateDisplayName).toHaveBeenCalledWith('Jane Doe');
    });
  });

  it('allows clearing display name (submitting empty string)', async () => {
    const user = userEvent.setup();
    render(<ProfileSection />);

    const input = screen.getByDisplayValue('John Doe');
    await user.clear(input);

    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    expect(saveButton).toBeEnabled();

    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateDisplayName).toHaveBeenCalledWith('');
    });
  });

  it('shows saving spinner and disables button when isSaving is true', () => {
    vi.mocked(useProfileSettings).mockReturnValue({
      profile: mockProfile,
      isSaving: true,
      updateDisplayName: mockUpdateDisplayName,
      updateCurrency: vi.fn(),
      updateLocale: vi.fn(),
      updateTheme: vi.fn(),
    });

    render(<ProfileSection isSavingOverride={true} />);

    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Saving.../i })).toBeDisabled();
  });
});
