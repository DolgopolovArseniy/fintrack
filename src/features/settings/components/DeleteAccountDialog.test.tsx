import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuth } from '@/features/auth';
import type { AuthUser } from '@/features/auth';
import { useAccountDeletion } from '../hooks/useAccountDeletion';
import { DeleteAccountDialog } from './DeleteAccountDialog';

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

const mockPasswordUser: AuthUser = {
  uid: 'user-pwd',
  email: 'pwd@example.com',
  displayName: 'Password User',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  providerIds: ['password'],
};

const mockGoogleUser: AuthUser = {
  uid: 'user-google',
  email: 'google@example.com',
  displayName: 'Google User',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  providerIds: ['google.com'],
};

const mockAnonUser: AuthUser = {
  uid: 'user-anon',
  email: null,
  displayName: null,
  photoURL: null,
  emailVerified: false,
  isAnonymous: true,
  providerIds: [],
};

describe('DeleteAccountDialog', () => {
  const mockDeleteAccount = vi.fn().mockResolvedValue(true);
  const mockResetState = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: mockPasswordUser,
      profile: null,
      profileStatus: 'ready',
      refreshUser: vi.fn(),
      refreshProfile: vi.fn(),
    });

    vi.mocked(useAccountDeletion).mockReturnValue({
      deleteAccount: mockDeleteAccount,
      isDeleting: false,
      progress: null,
      error: null,
      resetState: mockResetState,
    });
  });

  it('renders title, warning, input and disabled confirm button initially', () => {
    render(
      <DeleteAccountDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        isDesktop={true}
      />,
    );

    expect(screen.getByText('Delete account and all data')).toBeInTheDocument();
    expect(
      screen.getAllByText(
        /This action is permanent and completely irreversible/i,
      ).length,
    ).toBeGreaterThan(0);

    const deleteBtn = screen.getByRole('button', {
      name: /Permanently Delete Everything/i,
    });
    expect(deleteBtn).toBeDisabled();
  });

  it('keeps confirm button disabled if phrase matches but password is empty for password user', async () => {
    const user = userEvent.setup();
    render(
      <DeleteAccountDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        isDesktop={true}
      />,
    );

    const input = screen.getByTestId('delete-confirmation-input');
    await user.type(input, 'DELETE');

    const deleteBtn = screen.getByRole('button', {
      name: /Permanently Delete Everything/i,
    });
    expect(deleteBtn).toBeDisabled();
  });

  it('enables confirm button and calls deleteAccount with password for password user', async () => {
    const user = userEvent.setup();
    render(
      <DeleteAccountDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        isDesktop={true}
      />,
    );

    const phraseInput = screen.getByTestId('delete-confirmation-input');
    await user.type(phraseInput, 'DELETE');

    const passwordInput = screen.getByTestId('delete-account-password');
    await user.type(passwordInput, 'secret123');

    const deleteBtn = screen.getByRole('button', {
      name: /Permanently Delete Everything/i,
    });
    expect(deleteBtn).toBeEnabled();

    await user.click(deleteBtn);

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledWith({
        password: 'secret123',
      });
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('does not require password and triggers deleteAccount for anonymous demo user', async () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: mockAnonUser,
      profile: null,
      profileStatus: 'ready',
      refreshUser: vi.fn(),
      refreshProfile: vi.fn(),
    });

    const user = userEvent.setup();
    render(
      <DeleteAccountDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        isDesktop={true}
      />,
    );

    expect(
      screen.queryByTestId('delete-account-password'),
    ).not.toBeInTheDocument();

    const phraseInput = screen.getByTestId('delete-confirmation-input');
    await user.type(phraseInput, 'DELETE');

    const deleteBtn = screen.getByRole('button', {
      name: /Permanently Delete Everything/i,
    });
    expect(deleteBtn).toBeEnabled();

    await user.click(deleteBtn);

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledWith(undefined);
    });
  });

  it('prompts Google user and calls deleteAccount with useGoogle flag', async () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: mockGoogleUser,
      profile: null,
      profileStatus: 'ready',
      refreshUser: vi.fn(),
      refreshProfile: vi.fn(),
    });

    const user = userEvent.setup();
    render(
      <DeleteAccountDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        isDesktop={true}
      />,
    );

    expect(
      screen.getByText(
        /Confirm deletion by signing in with your Google account/i,
      ),
    ).toBeInTheDocument();

    const phraseInput = screen.getByTestId('delete-confirmation-input');
    await user.type(phraseInput, 'DELETE');

    const deleteBtn = screen.getByRole('button', {
      name: /Permanently Delete Everything/i,
    });
    expect(deleteBtn).toBeEnabled();

    await user.click(deleteBtn);

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledWith({ useGoogle: true });
    });
  });

  it('displays error message when error is returned', () => {
    vi.mocked(useAccountDeletion).mockReturnValue({
      deleteAccount: mockDeleteAccount,
      isDeleting: false,
      progress: null,
      error: 'The password you entered is incorrect',
      resetState: mockResetState,
    });

    render(
      <DeleteAccountDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        isDesktop={true}
      />,
    );

    expect(
      screen.getByText('The password you entered is incorrect'),
    ).toBeInTheDocument();
  });

  it('displays progress phase when isDeleting is true', () => {
    vi.mocked(useAccountDeletion).mockReturnValue({
      deleteAccount: mockDeleteAccount,
      isDeleting: true,
      progress: { phase: 'transactions', deletedItems: 50 },
      error: null,
      resetState: mockResetState,
    });

    render(
      <DeleteAccountDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        isDesktop={true}
      />,
    );

    expect(
      screen.getAllByText(/Deleting data: Deleting transactions.../i).length,
    ).toBeGreaterThan(0);
  });
});
