import { describe, expect, it } from 'vitest';
import { AppError, toAppError } from './errors';

describe('AppError & toAppError', () => {
  it('creates an AppError instance with code and cause', () => {
    const original = new Error('original error');
    const appError = new AppError('permission-denied', 'Custom message', {
      cause: original,
    });

    expect(appError).toBeInstanceOf(Error);
    expect(appError).toBeInstanceOf(AppError);
    expect(appError.code).toBe('permission-denied');
    expect(appError.message).toBe('Custom message');
    expect(appError.cause).toBe(original);
  });

  it('returns existing AppError unchanged', () => {
    const error = new AppError('not-found', 'Not found');
    expect(toAppError(error)).toBe(error);
  });

  it('maps Firebase code without prefix', () => {
    const fbError = {
      code: 'permission-denied',
      message: 'Missing permissions',
    };
    const error = toAppError(fbError);

    expect(error.code).toBe('permission-denied');
    expect(error.message).toBe('Missing permissions');
    expect(error.cause).toBe(fbError);
  });

  it('maps prefixed firestore codes and unavailable to offline', () => {
    const unavailable = {
      code: 'firestore/unavailable',
      message: 'Service unavailable',
    };
    const error = toAppError(unavailable);

    expect(error.code).toBe('offline');
    expect(error.message).toBe('Service unavailable');
  });

  it('maps auth/* codes directly', () => {
    const authError = {
      code: 'auth/user-not-found',
      message: 'No user record',
    };
    const error = toAppError(authError);

    expect(error.code).toBe('auth/user-not-found');
    expect(error.message).toBe('No user record');
  });

  it('maps ZodError to validation', () => {
    const zodError = new Error('Invalid format');
    zodError.name = 'ZodError';

    const error = toAppError(zodError);
    expect(error.code).toBe('validation');
    expect(error.message).toBe('Invalid format');
  });

  it('maps generic Error with network/offline message to offline', () => {
    const networkError = new Error('Network error: Failed to fetch');
    const error = toAppError(networkError);

    expect(error.code).toBe('offline');
    expect(error.message).toBe('Network error: Failed to fetch');
  });

  it('maps generic Error to unknown', () => {
    const standardError = new Error('Something went wrong');
    const error = toAppError(standardError);

    expect(error.code).toBe('unknown');
    expect(error.message).toBe('Something went wrong');
  });

  it('maps string error to unknown with string message', () => {
    const error = toAppError('A simple failure string');

    expect(error.code).toBe('unknown');
    expect(error.message).toBe('A simple failure string');
    expect(error.cause).toBe('A simple failure string');
  });

  it('maps null, undefined and objects without code to unknown', () => {
    const errorNull = toAppError(null);
    expect(errorNull.code).toBe('unknown');

    const errorUndefined = toAppError(undefined);
    expect(errorUndefined.code).toBe('unknown');

    const errorObj = toAppError({ random: 123 });
    expect(errorObj.code).toBe('unknown');
  });
});
