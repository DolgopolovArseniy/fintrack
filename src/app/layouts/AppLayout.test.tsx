import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { AppLayout } from './AppLayout';

vi.mock('@/features/auth', () => ({
  EmailVerificationBanner: () => (
    <div data-testid="email-verification-banner">Email Verification Banner</div>
  ),
  UserMenu: ({ variant }: { variant?: string }) => (
    <div data-testid={`user-menu-${variant ?? 'default'}`}>
      User Menu {variant ?? 'default'}
    </div>
  ),
}));

describe('AppLayout', () => {
  it('renders brand logo, sidebar navigation, user menu, and verification banner', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <MemoryRouter initialEntries={['/app/dashboard']}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route
                path="/app/dashboard"
                element={<div>Dashboard Content</div>}
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    expect(screen.getByTestId('email-verification-banner')).toBeInTheDocument();
    expect(screen.getByTestId('user-menu-default')).toBeInTheDocument();
    expect(screen.getByTestId('user-menu-compact')).toBeInTheDocument();
  });
});
