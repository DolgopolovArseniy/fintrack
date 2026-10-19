import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useAuth } from '@/features/auth';
import { useAccountDeletion } from '../hooks/useAccountDeletion';
import { DangerZoneSection } from './DangerZoneSection';

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(),
}));

vi.mock('@/features/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/auth')>();
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

vi.mock('../hooks/useAccountDeletion', () => ({
  useAccountDeletion: vi.fn(),
}));

describe('DangerZoneSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useOnlineStatus).mockReturnValue({ isOnline: true });
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: {
        uid: 'user-123',
        email: 'test@example.com',
        displayName: 'Test',
        photoURL: null,
        emailVerified: true,
        isAnonymous: false,
        providerIds: ['password'],
      },
      profile: null,
      profileStatus: 'ready',
      refreshUser: vi.fn(),
      refreshProfile: vi.fn(),
    });
    vi.mocked(useAccountDeletion).mockReturnValue({
      deleteAccount: vi.fn().mockResolvedValue(true),
      isDeleting: false,
      progress: null,
      error: null,
      resetState: vi.fn(),
    });
  });

  it('renders title, description, and delete button', () => {
    render(<DangerZoneSection />);

    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
    expect(screen.getByText('Delete Account & Data')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Delete Account/i }),
    ).toBeInTheDocument();
  });

  it('opens DeleteAccountDialog when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<DangerZoneSection />);

    const deleteBtn = screen.getByRole('button', { name: /Delete Account/i });
    await user.click(deleteBtn);

    expect(
      await screen.findByText('Delete account and all data'),
    ).toBeInTheDocument();
  });

  it('disables delete button and shows offline notice when offline', () => {
    vi.mocked(useOnlineStatus).mockReturnValue({ isOnline: false });

    render(<DangerZoneSection />);

    const deleteBtn = screen.getByRole('button', { name: /Delete Account/i });
    expect(deleteBtn).toBeDisabled();
    expect(
      screen.getByText(/This action requires an active internet connection/i),
    ).toBeInTheDocument();
  });
});
