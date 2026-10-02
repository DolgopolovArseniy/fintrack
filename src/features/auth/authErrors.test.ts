import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/errors';
import { getAuthErrorKey } from './authErrors';

describe('getAuthErrorKey', () => {
  it('maps invalid credential error codes to auth.errors.invalidCredential', () => {
    expect(getAuthErrorKey({ code: 'auth/invalid-credential' })).toBe(
      'auth.errors.invalidCredential',
    );
    expect(getAuthErrorKey({ code: 'auth/wrong-password' })).toBe(
      'auth.errors.invalidCredential',
    );
    expect(getAuthErrorKey({ code: 'auth/user-not-found' })).toBe(
      'auth.errors.invalidCredential',
    );
  });

  it('maps invalid email error to auth.errors.invalidEmail', () => {
    expect(getAuthErrorKey({ code: 'auth/invalid-email' })).toBe(
      'auth.errors.invalidEmail',
    );
  });

  it('maps email already in use error to auth.errors.emailInUse', () => {
    expect(getAuthErrorKey({ code: 'auth/email-already-in-use' })).toBe(
      'auth.errors.emailInUse',
    );
  });

  it('maps weak password error to auth.errors.weakPassword', () => {
    expect(getAuthErrorKey({ code: 'auth/weak-password' })).toBe(
      'auth.errors.weakPassword',
    );
  });

  it('maps too many requests error to auth.errors.tooManyRequests', () => {
    expect(getAuthErrorKey({ code: 'auth/too-many-requests' })).toBe(
      'auth.errors.tooManyRequests',
    );
  });

  it('maps network errors to auth.errors.network', () => {
    expect(getAuthErrorKey({ code: 'auth/network-request-failed' })).toBe(
      'auth.errors.network',
    );
    expect(getAuthErrorKey(new AppError('offline'))).toBe(
      'auth.errors.network',
    );
    expect(getAuthErrorKey({ code: 'offline' })).toBe('auth.errors.network');
  });

  it('maps user disabled error to auth.errors.userDisabled', () => {
    expect(getAuthErrorKey({ code: 'auth/user-disabled' })).toBe(
      'auth.errors.userDisabled',
    );
  });

  it('maps popup blocked error to auth.errors.popupBlocked', () => {
    expect(getAuthErrorKey({ code: 'auth/popup-blocked' })).toBe(
      'auth.errors.popupBlocked',
    );
  });

  it('maps account exists with different credential to auth.errors.accountExistsDifferentProvider', () => {
    expect(
      getAuthErrorKey({
        code: 'auth/account-exists-with-different-credential',
      }),
    ).toBe('auth.errors.accountExistsDifferentProvider');
  });

  it('maps operation not allowed error to auth.errors.operationNotAllowed', () => {
    expect(getAuthErrorKey({ code: 'auth/operation-not-allowed' })).toBe(
      'auth.errors.operationNotAllowed',
    );
  });

  it('returns null for popup closed/cancelled by user', () => {
    expect(getAuthErrorKey({ code: 'auth/popup-closed-by-user' })).toBeNull();
    expect(
      getAuthErrorKey({ code: 'auth/cancelled-popup-request' }),
    ).toBeNull();
  });

  it('returns errors.unknown for unfamiliar error codes or unhandled objects', () => {
    expect(getAuthErrorKey({ code: 'auth/internal-error' })).toBe(
      'errors.unknown',
    );
    expect(getAuthErrorKey(new Error('something broke'))).toBe(
      'errors.unknown',
    );
    expect(getAuthErrorKey('string error')).toBe('errors.unknown');
    expect(getAuthErrorKey(null)).toBe('errors.unknown');
    expect(getAuthErrorKey(undefined)).toBe('errors.unknown');
  });

  it('unwraps AppError cause when AppError code is unknown or general', () => {
    const rawError = { code: 'auth/invalid-credential' };
    const wrapped = new AppError('unknown', 'Failed', { cause: rawError });
    expect(getAuthErrorKey(wrapped)).toBe('auth.errors.invalidCredential');
  });
});
