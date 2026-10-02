import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '@/lib/errors';
import * as authService from '../authService';
import type { AuthUser } from '../types';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ResetPasswordForm } from './ResetPasswordForm';

vi.mock('../authService', () => ({
  signInWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  registerWithEmail: vi.fn(),
  sendPasswordReset: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUser: AuthUser = {
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  emailVerified: false,
  isAnonymous: false,
  providerIds: ['password'],
};

describe('Auth Forms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LoginForm', () => {
    it('renders login form with title, inputs, and links', () => {
      render(
        <MemoryRouter>
          <LoginForm />
        </MemoryRouter>,
      );

      expect(
        screen.getByRole('heading', { name: 'Welcome back' }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Sign in' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Continue with Google' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'Forgot password?' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Sign up' })).toBeInTheDocument();
    });

    it('shows validation errors when submitted with empty fields', async () => {
      render(
        <MemoryRouter>
          <LoginForm />
        </MemoryRouter>,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      await waitFor(() => {
        const requiredMessages = screen.getAllByText('This field is required');
        expect(requiredMessages.length).toBeGreaterThanOrEqual(2);
      });
      expect(authService.signInWithEmail).not.toHaveBeenCalled();
    });

    it('submits valid credentials and navigates on success', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.signInWithEmail).mockResolvedValueOnce(mockUser);

      render(
        <MemoryRouter>
          <LoginForm />
        </MemoryRouter>,
      );

      await user.type(screen.getByLabelText('Email'), 'user@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Sign in' }));

      await waitFor(() => {
        expect(authService.signInWithEmail).toHaveBeenCalledWith({
          email: 'user@example.com',
          password: 'password123',
        });
        expect(mockNavigate).toHaveBeenCalledWith('/app/dashboard');
      });
    });

    it('clears password and displays invalid credential error on failure', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.signInWithEmail).mockRejectedValueOnce(
        new AppError('auth/invalid-credential', 'Invalid credentials'),
      );

      render(
        <MemoryRouter>
          <LoginForm />
        </MemoryRouter>,
      );

      await user.type(screen.getByLabelText('Email'), 'user@example.com');
      await user.type(screen.getByLabelText('Password'), 'wrong-password');
      await user.click(screen.getByRole('button', { name: 'Sign in' }));

      await waitFor(() => {
        expect(
          screen.getByText('Invalid email or password'),
        ).toBeInTheDocument();
      });

      // Password input should be cleared
      expect(screen.getByLabelText('Password')).toHaveValue('');
    });

    it('handles Google sign in and ignores user cancelled popup silently', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.signInWithGoogle).mockRejectedValueOnce(
        new AppError('auth/popup-closed-by-user', 'Popup closed'),
      );

      render(
        <MemoryRouter>
          <LoginForm />
        </MemoryRouter>,
      );

      await user.click(
        screen.getByRole('button', { name: 'Continue with Google' }),
      );

      await waitFor(() => {
        expect(authService.signInWithGoogle).toHaveBeenCalledTimes(1);
      });

      // No error alert should be visible
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('RegisterForm', () => {
    it('renders register form with optional name field', () => {
      render(
        <MemoryRouter>
          <RegisterForm />
        </MemoryRouter>,
      );

      expect(
        screen.getByRole('heading', { name: 'Create an account' }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Name (optional)')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Create account' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    });

    it('shows password too short validation message for short password', async () => {
      const user = userEvent.setup();

      render(
        <MemoryRouter>
          <RegisterForm />
        </MemoryRouter>,
      );

      await user.type(screen.getByLabelText('Email'), 'user@example.com');
      await user.type(screen.getByLabelText('Password'), '12345');
      await user.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => {
        expect(
          screen.getByText('Password must be at least 8 characters long'),
        ).toBeInTheDocument();
      });
      expect(authService.registerWithEmail).not.toHaveBeenCalled();
    });

    it('submits valid registration data and navigates to dashboard', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.registerWithEmail).mockResolvedValueOnce(mockUser);

      render(
        <MemoryRouter>
          <RegisterForm />
        </MemoryRouter>,
      );

      await user.type(screen.getByLabelText('Name (optional)'), 'Alice');
      await user.type(screen.getByLabelText('Email'), 'alice@example.com');
      await user.type(screen.getByLabelText('Password'), 'strongpassword');
      await user.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => {
        expect(authService.registerWithEmail).toHaveBeenCalledWith({
          email: 'alice@example.com',
          password: 'strongpassword',
          displayName: 'Alice',
        });
        expect(mockNavigate).toHaveBeenCalledWith('/app/dashboard');
      });
    });

    it('displays error and preserves entered values when email is already in use', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.registerWithEmail).mockRejectedValueOnce(
        new AppError('auth/email-already-in-use', 'Email in use'),
      );

      render(
        <MemoryRouter>
          <RegisterForm />
        </MemoryRouter>,
      );

      await user.type(screen.getByLabelText('Name (optional)'), 'Bob');
      await user.type(screen.getByLabelText('Email'), 'bob@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => {
        expect(
          screen.getByText('An account with this email already exists'),
        ).toBeInTheDocument();
      });

      // Fields must remain preserved
      expect(screen.getByLabelText('Name (optional)')).toHaveValue('Bob');
      expect(screen.getByLabelText('Email')).toHaveValue('bob@example.com');
      expect(screen.getByLabelText('Password')).toHaveValue('password123');
    });
  });

  describe('ResetPasswordForm', () => {
    it('renders reset password form with email input', () => {
      render(
        <MemoryRouter>
          <ResetPasswordForm />
        </MemoryRouter>,
      );

      expect(
        screen.getByRole('heading', { name: 'Reset password' }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Send reset link' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: 'Back to sign in' }),
      ).toBeInTheDocument();
    });

    it('submits email and shows success screen on resolution', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.sendPasswordReset).mockResolvedValueOnce(undefined);

      render(
        <MemoryRouter>
          <ResetPasswordForm />
        </MemoryRouter>,
      );

      await user.type(screen.getByLabelText('Email'), 'user@example.com');
      await user.click(screen.getByRole('button', { name: 'Send reset link' }));

      await waitFor(() => {
        expect(authService.sendPasswordReset).toHaveBeenCalledWith(
          'user@example.com',
        );
        expect(
          screen.getByRole('heading', { name: 'Check your email' }),
        ).toBeInTheDocument();
      });
    });

    it('shows success screen even if account does not exist (auth/user-not-found)', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.sendPasswordReset).mockRejectedValueOnce(
        new AppError('auth/user-not-found', 'User not found'),
      );

      render(
        <MemoryRouter>
          <ResetPasswordForm />
        </MemoryRouter>,
      );

      await user.type(
        screen.getByLabelText('Email'),
        'nonexistent@example.com',
      );
      await user.click(screen.getByRole('button', { name: 'Send reset link' }));

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: 'Check your email' }),
        ).toBeInTheDocument();
      });
    });

    it('displays network error when reset request encounters network failure', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.sendPasswordReset).mockRejectedValueOnce(
        new AppError('auth/network-request-failed', 'Network failed'),
      );

      render(
        <MemoryRouter>
          <ResetPasswordForm />
        </MemoryRouter>,
      );

      await user.type(screen.getByLabelText('Email'), 'user@example.com');
      await user.click(screen.getByRole('button', { name: 'Send reset link' }));

      await waitFor(() => {
        expect(
          screen.getByText(
            'Network error. Please check your connection and try again',
          ),
        ).toBeInTheDocument();
      });
    });
  });
});
