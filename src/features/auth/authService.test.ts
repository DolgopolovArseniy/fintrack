import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import {
  toAuthUser,
  subscribeToAuthState,
  registerWithEmail,
  signInWithEmail,
  signInWithGoogle,
  sendPasswordReset,
  sendVerificationEmail,
  reloadCurrentUser,
  signOutUser,
  type FirebaseUserLike,
} from './authService';

const {
  mockCreateUserWithEmailAndPassword,
  mockSignInWithEmailAndPassword,
  mockSignInWithPopup,
  mockSendPasswordResetEmail,
  mockSendEmailVerification,
  mockUpdateProfile,
  mockReload,
  mockSignOut,
  mockOnAuthStateChanged,
  mockCurrentUser,
} = vi.hoisted(() => ({
  mockCreateUserWithEmailAndPassword: vi.fn(),
  mockSignInWithEmailAndPassword: vi.fn(),
  mockSignInWithPopup: vi.fn(),
  mockSendPasswordResetEmail: vi.fn(),
  mockSendEmailVerification: vi.fn(),
  mockUpdateProfile: vi.fn(),
  mockReload: vi.fn(),
  mockSignOut: vi.fn(),
  mockOnAuthStateChanged: vi.fn(),
  mockCurrentUser: { current: null as FirebaseUserLike | null },
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class MockGoogleAuthProvider {},
  createUserWithEmailAndPassword: mockCreateUserWithEmailAndPassword,
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
  signInWithPopup: mockSignInWithPopup,
  sendPasswordResetEmail: mockSendPasswordResetEmail,
  sendEmailVerification: mockSendEmailVerification,
  updateProfile: mockUpdateProfile,
  reload: mockReload,
  signOut: mockSignOut,
  onAuthStateChanged: mockOnAuthStateChanged,
}));

vi.mock('@/lib/firebase', () => ({
  auth: {
    get currentUser() {
      return mockCurrentUser.current;
    },
  },
}));

describe('toAuthUser', () => {
  it('converts password user correctly', () => {
    const firebaseUser: FirebaseUserLike = {
      uid: 'user-pwd-1',
      email: 'user@example.com',
      displayName: 'Password User',
      photoURL: null,
      emailVerified: true,
      isAnonymous: false,
      providerData: [{ providerId: 'password' }],
    };

    expect(toAuthUser(firebaseUser)).toEqual({
      uid: 'user-pwd-1',
      email: 'user@example.com',
      displayName: 'Password User',
      photoURL: null,
      emailVerified: true,
      isAnonymous: false,
      providerIds: ['password'],
    });
  });

  it('converts Google user correctly', () => {
    const firebaseUser: FirebaseUserLike = {
      uid: 'user-google-1',
      email: 'google@example.com',
      displayName: 'Google User',
      photoURL: 'https://lh3.googleusercontent.com/avatar.jpg',
      emailVerified: true,
      isAnonymous: false,
      providerData: [{ providerId: 'google.com' }],
    };

    expect(toAuthUser(firebaseUser)).toEqual({
      uid: 'user-google-1',
      email: 'google@example.com',
      displayName: 'Google User',
      photoURL: 'https://lh3.googleusercontent.com/avatar.jpg',
      emailVerified: true,
      isAnonymous: false,
      providerIds: ['google.com'],
    });
  });

  it('converts anonymous user with empty provider data', () => {
    const firebaseUser: FirebaseUserLike = {
      uid: 'user-anon-1',
      email: null,
      displayName: null,
      photoURL: null,
      emailVerified: false,
      isAnonymous: true,
      providerData: [],
    };

    expect(toAuthUser(firebaseUser)).toEqual({
      uid: 'user-anon-1',
      email: null,
      displayName: null,
      photoURL: null,
      emailVerified: false,
      isAnonymous: true,
      providerIds: [],
    });
  });

  it('handles user without email and multiple providers', () => {
    const firebaseUser: FirebaseUserLike = {
      uid: 'user-custom-1',
      email: null,
      displayName: 'Custom User',
      photoURL: null,
      emailVerified: false,
      isAnonymous: false,
      providerData: [{ providerId: 'custom' }, { providerId: 'phone' }],
    };

    expect(toAuthUser(firebaseUser)).toEqual({
      uid: 'user-custom-1',
      email: null,
      displayName: 'Custom User',
      photoURL: null,
      emailVerified: false,
      isAnonymous: false,
      providerIds: ['custom', 'phone'],
    });
  });
});

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser.current = null;
  });

  describe('subscribeToAuthState', () => {
    it('sets up listener and maps user on change', () => {
      const unsubscribeMock = vi.fn();
      let capturedOnUser: ((user: FirebaseUserLike | null) => void) | undefined;

      mockOnAuthStateChanged.mockImplementation(
        (_auth: unknown, next: (user: FirebaseUserLike | null) => void) => {
          capturedOnUser = next;
          return unsubscribeMock;
        },
      );

      const onUser = vi.fn();
      const onError = vi.fn();

      const unsubscribe = subscribeToAuthState(onUser, onError);

      expect(mockOnAuthStateChanged).toHaveBeenCalled();
      expect(typeof capturedOnUser).toBe('function');

      const mockFirebaseUser: FirebaseUserLike = {
        uid: 'user-sub-1',
        email: 'sub@example.com',
        displayName: 'Sub User',
        photoURL: null,
        emailVerified: true,
        isAnonymous: false,
        providerData: [{ providerId: 'password' }],
      };

      capturedOnUser!(mockFirebaseUser);
      expect(onUser).toHaveBeenCalledWith({
        uid: 'user-sub-1',
        email: 'sub@example.com',
        displayName: 'Sub User',
        photoURL: null,
        emailVerified: true,
        isAnonymous: false,
        providerIds: ['password'],
      });

      capturedOnUser!(null);
      expect(onUser).toHaveBeenCalledWith(null);

      unsubscribe();
      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('forwards error converted to AppError', () => {
      let capturedOnError: ((error: unknown) => void) | undefined;

      mockOnAuthStateChanged.mockImplementation(
        (_auth: unknown, _next: unknown, errorCb: (error: unknown) => void) => {
          capturedOnError = errorCb;
          return vi.fn();
        },
      );

      const onUser = vi.fn();
      const onError = vi.fn();

      subscribeToAuthState(onUser, onError);

      capturedOnError!({ code: 'auth/network-request-failed' });
      expect(onError).toHaveBeenCalledWith(expect.any(AppError));
      const firstCall = onError.mock.calls[0];
      expect(firstCall).toBeDefined();
      if (firstCall && firstCall[0] instanceof AppError) {
        expect(firstCall[0].code).toBe('auth/network-request-failed');
      }
    });
  });

  describe('registerWithEmail', () => {
    const fakeFirebaseUser: FirebaseUserLike = {
      uid: 'new-uid-1',
      email: 'new@example.com',
      displayName: null,
      photoURL: null,
      emailVerified: false,
      isAnonymous: false,
      providerData: [{ providerId: 'password' }],
    };

    it('creates user, updates profile when name provided, and sends verification email', async () => {
      mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({
        user: fakeFirebaseUser,
      });
      mockUpdateProfile.mockResolvedValueOnce(undefined);
      mockSendEmailVerification.mockResolvedValueOnce(undefined);

      const result = await registerWithEmail({
        email: 'new@example.com',
        password: 'password123',
        displayName: '   John Doe   ',
      });

      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'new@example.com',
        'password123',
      );
      expect(mockUpdateProfile).toHaveBeenCalledWith(fakeFirebaseUser, {
        displayName: 'John Doe',
      });
      expect(mockSendEmailVerification).toHaveBeenCalledWith(fakeFirebaseUser);
      expect(result.uid).toBe('new-uid-1');
    });

    it('does not call updateProfile if displayName is empty or omitted', async () => {
      mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({
        user: fakeFirebaseUser,
      });
      mockSendEmailVerification.mockResolvedValueOnce(undefined);

      await registerWithEmail({
        email: 'new@example.com',
        password: 'password123',
        displayName: '   ',
      });

      expect(mockUpdateProfile).not.toHaveBeenCalled();
      expect(mockSendEmailVerification).toHaveBeenCalledWith(fakeFirebaseUser);
    });

    it('logs warning and does not throw if sendEmailVerification fails', async () => {
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
      mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({
        user: fakeFirebaseUser,
      });
      mockSendEmailVerification.mockRejectedValueOnce(
        new Error('Failed to send email'),
      );

      const result = await registerWithEmail({
        email: 'new@example.com',
        password: 'password123',
      });

      expect(warnSpy).toHaveBeenCalledWith(
        'Failed to send verification email during registration',
        expect.any(Error),
      );
      expect(result.uid).toBe('new-uid-1');
      warnSpy.mockRestore();
    });

    it('wraps and throws AppError if createUserWithEmailAndPassword fails', async () => {
      mockCreateUserWithEmailAndPassword.mockRejectedValueOnce({
        code: 'auth/email-already-in-use',
        message: 'The email address is already in use by another account.',
      });

      await expect(
        registerWithEmail({
          email: 'exists@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('signInWithEmail', () => {
    it('signs in and returns AuthUser on success', async () => {
      const fakeUser: FirebaseUserLike = {
        uid: 'signin-uid',
        email: 'signin@example.com',
        displayName: 'Sign In',
        photoURL: null,
        emailVerified: true,
        isAnonymous: false,
        providerData: [{ providerId: 'password' }],
      };
      mockSignInWithEmailAndPassword.mockResolvedValueOnce({ user: fakeUser });

      const result = await signInWithEmail({
        email: 'signin@example.com',
        password: 'pass',
      });

      expect(result.uid).toBe('signin-uid');
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'signin@example.com',
        'pass',
      );
    });

    it('wraps and throws AppError on failure', async () => {
      mockSignInWithEmailAndPassword.mockRejectedValueOnce({
        code: 'auth/invalid-credential',
      });

      await expect(
        signInWithEmail({ email: 'wrong@example.com', password: 'pass' }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('signInWithGoogle', () => {
    it('signs in with popup and returns AuthUser on success', async () => {
      const fakeUser: FirebaseUserLike = {
        uid: 'google-uid',
        email: 'google@example.com',
        displayName: 'Google Sign In',
        photoURL: null,
        emailVerified: true,
        isAnonymous: false,
        providerData: [{ providerId: 'google.com' }],
      };
      mockSignInWithPopup.mockResolvedValueOnce({ user: fakeUser });

      const result = await signInWithGoogle();
      expect(result.uid).toBe('google-uid');
      expect(mockSignInWithPopup).toHaveBeenCalled();
    });

    it('wraps and throws AppError on failure', async () => {
      mockSignInWithPopup.mockRejectedValueOnce({
        code: 'auth/popup-closed-by-user',
      });

      await expect(signInWithGoogle()).rejects.toThrow(AppError);
    });
  });

  describe('sendPasswordReset', () => {
    it('calls sendPasswordResetEmail', async () => {
      mockSendPasswordResetEmail.mockResolvedValueOnce(undefined);

      await expect(
        sendPasswordReset('reset@example.com'),
      ).resolves.toBeUndefined();
      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
        expect.anything(),
        'reset@example.com',
      );
    });

    it('wraps and throws AppError on failure', async () => {
      mockSendPasswordResetEmail.mockRejectedValueOnce({
        code: 'auth/user-not-found',
      });

      await expect(sendPasswordReset('unknown@example.com')).rejects.toThrow(
        AppError,
      );
    });
  });

  describe('sendVerificationEmail', () => {
    it('throws unauthenticated AppError if currentUser is null', async () => {
      mockCurrentUser.current = null;

      await expect(sendVerificationEmail()).rejects.toThrow(
        expect.objectContaining({ code: 'unauthenticated' }),
      );
      expect(mockSendEmailVerification).not.toHaveBeenCalled();
    });

    it('calls sendEmailVerification for current user', async () => {
      const fakeUser: FirebaseUserLike = {
        uid: 'verified-uid',
        email: 'v@example.com',
        displayName: 'V',
        photoURL: null,
        emailVerified: false,
        isAnonymous: false,
        providerData: [{ providerId: 'password' }],
      };
      mockCurrentUser.current = fakeUser;
      mockSendEmailVerification.mockResolvedValueOnce(undefined);

      await expect(sendVerificationEmail()).resolves.toBeUndefined();
      expect(mockSendEmailVerification).toHaveBeenCalledWith(fakeUser);
    });

    it('wraps and throws AppError if sendEmailVerification fails', async () => {
      const fakeUser: FirebaseUserLike = {
        uid: 'verified-uid',
        email: 'v@example.com',
        displayName: 'V',
        photoURL: null,
        emailVerified: false,
        isAnonymous: false,
        providerData: [{ providerId: 'password' }],
      };
      mockCurrentUser.current = fakeUser;
      mockSendEmailVerification.mockRejectedValueOnce({
        code: 'auth/too-many-requests',
      });

      await expect(sendVerificationEmail()).rejects.toThrow(AppError);
    });
  });

  describe('reloadCurrentUser', () => {
    it('returns null if currentUser is null', async () => {
      mockCurrentUser.current = null;
      const result = await reloadCurrentUser();
      expect(result).toBeNull();
      expect(mockReload).not.toHaveBeenCalled();
    });

    it('reloads and returns updated user', async () => {
      const fakeUser: FirebaseUserLike = {
        uid: 'reload-uid',
        email: 'r@example.com',
        displayName: 'Before Reload',
        photoURL: null,
        emailVerified: false,
        isAnonymous: false,
        providerData: [{ providerId: 'password' }],
      };
      mockCurrentUser.current = fakeUser;
      mockReload.mockImplementationOnce(() => {
        mockCurrentUser.current = {
          ...fakeUser,
          emailVerified: true,
          displayName: 'After Reload',
        };
        return Promise.resolve();
      });

      const result = await reloadCurrentUser();
      expect(mockReload).toHaveBeenCalledWith(fakeUser);
      expect(result).toEqual({
        uid: 'reload-uid',
        email: 'r@example.com',
        displayName: 'After Reload',
        photoURL: null,
        emailVerified: true,
        isAnonymous: false,
        providerIds: ['password'],
      });
    });

    it('wraps and throws AppError if reload fails', async () => {
      mockCurrentUser.current = {
        uid: 'reload-uid',
        email: 'r@example.com',
        displayName: null,
        photoURL: null,
        emailVerified: false,
        isAnonymous: false,
        providerData: [],
      };
      mockReload.mockRejectedValueOnce({ code: 'auth/user-disabled' });

      await expect(reloadCurrentUser()).rejects.toThrow(AppError);
    });
  });

  describe('signOutUser', () => {
    it('calls signOut', async () => {
      mockSignOut.mockResolvedValueOnce(undefined);

      await expect(signOutUser()).resolves.toBeUndefined();
      expect(mockSignOut).toHaveBeenCalled();
    });

    it('wraps and throws AppError if signOut fails', async () => {
      mockSignOut.mockRejectedValueOnce({ code: 'auth/internal-error' });

      await expect(signOutUser()).rejects.toThrow(AppError);
    });
  });
});
