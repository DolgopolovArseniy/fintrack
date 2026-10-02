import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { useAuth } from '../useAuth';
import * as authService from '../authService';
import type { AuthUser } from '../types';
import { EmailVerificationBanner } from './EmailVerificationBanner';

vi.mock('../useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../authService', () => ({
  sendVerificationEmail: vi.fn(),
  reloadCurrentUser: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const unverifiedPasswordUser: AuthUser = {
  uid: 'user-1',
  email: 'test@example.com',
  displayName: 'Test',
  photoURL: null,
  emailVerified: false,
  isAnonymous: false,
  providerIds: ['password'],
};

describe('EmailVerificationBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when unauthenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'unauthenticated',
      refreshUser: vi.fn(),
    });

    const { container } = render(<EmailVerificationBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not render when user email is already verified', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: { ...unverifiedPasswordUser, emailVerified: true },
      refreshUser: vi.fn(),
    });

    const { container } = render(<EmailVerificationBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not render when user logged in via google only (no password provider)', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: {
        ...unverifiedPasswordUser,
        providerIds: ['google.com'],
      },
      refreshUser: vi.fn(),
    });

    const { container } = render(<EmailVerificationBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders when user has password provider and email is unverified', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: unverifiedPasswordUser,
      refreshUser: vi.fn(),
    });

    render(<EmailVerificationBanner />);

    expect(screen.getByText(/Verify your email address/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Resend email/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /I've verified/i }),
    ).toBeInTheDocument();
  });

  describe('Cooldown and Resend action with fake timers', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('triggers sendVerificationEmail and handles 60-second cooldown', async () => {
      vi.mocked(authService.sendVerificationEmail).mockResolvedValueOnce(
        undefined,
      );
      vi.mocked(useAuth).mockReturnValue({
        status: 'authenticated',
        user: unverifiedPasswordUser,
        refreshUser: vi.fn(),
      });

      render(<EmailVerificationBanner />);

      const resendButton = screen.getByRole('button', {
        name: /Resend email/i,
      });
      expect(resendButton).toBeEnabled();

      // Trigger send
      await act(async () => {
        resendButton.click();
        await Promise.resolve();
      });

      expect(authService.sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith('Verification email sent');

      // Check button in cooldown
      expect(
        screen.getByRole('button', { name: /Resend email in 60s/i }),
      ).toBeDisabled();

      // Advance by 20s
      act(() => {
        vi.advanceTimersByTime(20000);
      });
      expect(
        screen.getByRole('button', { name: /Resend email in 40s/i }),
      ).toBeDisabled();

      // Advance by remaining 40s
      act(() => {
        vi.advanceTimersByTime(40000);
      });
      expect(
        screen.getByRole('button', { name: /Resend email/i }),
      ).toBeEnabled();
    });
  });

  it('triggers refreshUser and displays info if still unverified', async () => {
    const refreshUserMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(authService.reloadCurrentUser).mockResolvedValueOnce(
      unverifiedPasswordUser,
    );

    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: unverifiedPasswordUser,
      refreshUser: refreshUserMock,
    });

    const user = userEvent.setup();
    render(<EmailVerificationBanner />);

    const verifiedButton = screen.getByRole('button', {
      name: /I've verified/i,
    });
    await user.click(verifiedButton);

    expect(refreshUserMock).toHaveBeenCalledTimes(1);
    expect(toast.info).toHaveBeenCalledWith(
      'Email is not verified yet. Please check your inbox or wait a moment.',
    );
  });
});
