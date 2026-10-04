import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeOnboardingBatch } from '../onboarding';
import type { AuthUser } from '../types';
import { useAuth } from '../useAuth';
import { OnboardingForm } from './OnboardingForm';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../onboarding', () => ({
  executeOnboardingBatch: vi.fn(),
}));

const mockUser: AuthUser = {
  uid: 'user-abc-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  providerIds: ['password'],
};

describe('OnboardingForm', () => {
  const mockRefreshProfile = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: mockUser,
      profileStatus: 'needsOnboarding',
      profile: null,
      refreshUser: vi.fn(),
      refreshProfile: mockRefreshProfile,
    });
  });

  it('renders base currency select, display name input, and submit button', () => {
    render(
      <MemoryRouter>
        <OnboardingForm />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('onboarding-form')).toBeInTheDocument();
    expect(
      screen.getByTestId('onboarding-currency-select'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('onboarding-display-name-input'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-submit-button')).toBeInTheDocument();
  });

  it('submits onboarding successfully and calls refreshProfile and navigate', async () => {
    vi.mocked(executeOnboardingBatch).mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter>
        <OnboardingForm />
      </MemoryRouter>,
    );

    const submitBtn = screen.getByTestId('onboarding-submit-button');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(executeOnboardingBatch).toHaveBeenCalledTimes(1);
    });

    expect(executeOnboardingBatch).toHaveBeenCalledWith(
      'user-abc-123',
      expect.objectContaining({
        baseCurrency: 'USD',
        displayName: 'Test User',
      }),
    );

    expect(mockRefreshProfile).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/app/dashboard', {
      replace: true,
    });
  });

  it('calls onSuccess callback instead of navigate if provided', async () => {
    vi.mocked(executeOnboardingBatch).mockResolvedValueOnce(undefined);
    const handleSuccess = vi.fn();

    render(
      <MemoryRouter>
        <OnboardingForm onSuccess={handleSuccess} />
      </MemoryRouter>,
    );

    const submitBtn = screen.getByTestId('onboarding-submit-button');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalledTimes(1);
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('displays error message if onboarding fails', async () => {
    vi.mocked(executeOnboardingBatch).mockRejectedValueOnce(
      new Error('Firestore write failed'),
    );

    render(
      <MemoryRouter>
        <OnboardingForm />
      </MemoryRouter>,
    );

    const submitBtn = screen.getByTestId('onboarding-submit-button');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('allows updating the display name before submit', async () => {
    vi.mocked(executeOnboardingBatch).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <OnboardingForm />
      </MemoryRouter>,
    );

    const input = screen.getByTestId('onboarding-display-name-input');
    await user.clear(input);
    await user.type(input, 'Jane Doe');

    const submitBtn = screen.getByTestId('onboarding-submit-button');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(executeOnboardingBatch).toHaveBeenCalledWith(
        'user-abc-123',
        expect.objectContaining({
          displayName: 'Jane Doe',
        }),
      );
    });
  });
});
