import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/features/auth';
import { OnboardingPage } from './OnboardingPage';

vi.mock('@/features/auth', async () => {
  const actual = await vi.importActual('@/features/auth');
  return {
    ...actual,
    useAuth: vi.fn(),
    OnboardingForm: () => (
      <div data-testid="mock-onboarding-form">Mock Onboarding Form</div>
    ),
  };
});

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders onboarding card and form when profileStatus is needsOnboarding', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: {
        uid: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
        emailVerified: true,
        isAnonymous: false,
        providerIds: ['password'],
      },
      profileStatus: 'needsOnboarding',
      profile: null,
      refreshUser: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('onboarding-page')).toBeInTheDocument();
    expect(screen.getByTestId('onboarding-content')).toBeInTheDocument();
    expect(screen.getByTestId('mock-onboarding-form')).toBeInTheDocument();
  });

  it('redirects to dashboard when profileStatus is ready', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: {
        uid: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
        emailVerified: true,
        isAnonymous: false,
        providerIds: ['password'],
      },
      profileStatus: 'ready',
      profile: {
        id: 'user-123',
        schemaVersion: 1,
        baseCurrency: 'USD',
        locale: 'en',
        theme: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      refreshUser: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route
            path="/app/dashboard"
            element={<div data-testid="dashboard-screen">Dashboard Screen</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('onboarding-page')).not.toBeInTheDocument();
    expect(screen.getByTestId('dashboard-screen')).toBeInTheDocument();
  });
});
