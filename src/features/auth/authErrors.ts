import { AppError } from '@/lib/errors';

export type AuthErrorKey =
  | 'auth.errors.invalidCredential'
  | 'auth.errors.invalidEmail'
  | 'auth.errors.emailInUse'
  | 'auth.errors.weakPassword'
  | 'auth.errors.tooManyRequests'
  | 'auth.errors.network'
  | 'auth.errors.userDisabled'
  | 'auth.errors.popupBlocked'
  | 'auth.errors.accountExistsDifferentProvider'
  | 'auth.errors.operationNotAllowed'
  | 'errors.unknown';

function extractErrorCode(error: unknown): string | null {
  if (error instanceof AppError) {
    if (error.code === 'offline') {
      return 'offline';
    }
    if (error.code.startsWith('auth/')) {
      return error.code;
    }
    if (
      error.cause &&
      typeof error.cause === 'object' &&
      'code' in error.cause &&
      typeof error.cause.code === 'string'
    ) {
      return error.cause.code;
    }
    return error.code;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code;
  }

  return null;
}

/**
 * Maps authentication errors (Firebase or AppError) to an i18n message key.
 * Returns null if the error should be silently ignored (e.g. user closed Google popup).
 */
export function getAuthErrorKey(error: unknown): AuthErrorKey | null {
  const code = extractErrorCode(error);

  if (!code) {
    return 'errors.unknown';
  }

  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null;

    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'auth.errors.invalidCredential';

    case 'auth/invalid-email':
      return 'auth.errors.invalidEmail';

    case 'auth/email-already-in-use':
      return 'auth.errors.emailInUse';

    case 'auth/weak-password':
      return 'auth.errors.weakPassword';

    case 'auth/too-many-requests':
      return 'auth.errors.tooManyRequests';

    case 'auth/network-request-failed':
    case 'offline':
      return 'auth.errors.network';

    case 'auth/user-disabled':
      return 'auth.errors.userDisabled';

    case 'auth/popup-blocked':
      return 'auth.errors.popupBlocked';

    case 'auth/account-exists-with-different-credential':
      return 'auth.errors.accountExistsDifferentProvider';

    case 'auth/operation-not-allowed':
      return 'auth.errors.operationNotAllowed';

    default:
      return 'errors.unknown';
  }
}
