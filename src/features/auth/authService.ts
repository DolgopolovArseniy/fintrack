import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { AppError, toAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { AuthUser } from './types';

export interface FirebaseUserLike {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  providerData: ReadonlyArray<{ providerId: string }>;
}

/**
 * Pure function mapping a Firebase User-like object to application AuthUser.
 */
export function toAuthUser(source: FirebaseUserLike): AuthUser {
  return {
    uid: source.uid,
    email: source.email,
    displayName: source.displayName,
    photoURL: source.photoURL,
    emailVerified: source.emailVerified,
    isAnonymous: source.isAnonymous,
    providerIds: source.providerData.map((provider) => provider.providerId),
  };
}

/**
 * Subscribes to Firebase auth state changes.
 */
export function subscribeToAuthState(
  onUser: (user: AuthUser | null) => void,
  onError: (error: AppError) => void,
): () => void {
  return onAuthStateChanged(
    auth,
    (firebaseUser) => {
      onUser(firebaseUser ? toAuthUser(firebaseUser) : null);
    },
    (firebaseError) => {
      onError(toAppError(firebaseError));
    },
  );
}

/**
 * Registers a new user with email and password, optionally updates display name,
 * and initiates email verification.
 */
export async function registerWithEmail(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<AuthUser> {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      input.email,
      input.password,
    );

    const trimmedName = input.displayName?.trim();
    if (trimmedName) {
      await updateProfile(userCredential.user, {
        displayName: trimmedName,
      });
    }

    try {
      await sendEmailVerification(userCredential.user);
    } catch (verificationError) {
      logger.warn(
        'Failed to send verification email during registration',
        verificationError,
      );
    }

    return toAuthUser(userCredential.user);
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * Signs in user with email and password.
 */
export async function signInWithEmail(input: {
  email: string;
  password: string;
}): Promise<AuthUser> {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      input.email,
      input.password,
    );
    return toAuthUser(userCredential.user);
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * Signs in user using Google popup.
 */
export async function signInWithGoogle(): Promise<AuthUser> {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    return toAuthUser(userCredential.user);
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * Requests password reset email.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * Resends verification email to the currently authenticated user.
 */
export async function sendVerificationEmail(): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new AppError(
      'unauthenticated',
      'No authenticated user to send verification email',
    );
  }

  try {
    await sendEmailVerification(currentUser);
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * Reloads the current user from Firebase and returns the fresh user state.
 */
export async function reloadCurrentUser(): Promise<AuthUser | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return null;
  }

  try {
    await reload(currentUser);
    return auth.currentUser ? toAuthUser(auth.currentUser) : null;
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * Signs out current user from Firebase.
 */
export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    throw toAppError(error);
  }
}
