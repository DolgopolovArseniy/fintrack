export type AppErrorCode =
  | 'permission-denied'
  | 'not-found'
  | 'offline'
  | 'validation'
  | 'unauthenticated'
  | 'unknown'
  | `auth/${string}`;

export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(
    code: AppErrorCode,
    message?: string,
    options?: { cause?: unknown },
  ) {
    super(message ?? code, options);
    this.name = 'AppError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

interface ErrorWithCode {
  code: string;
  message?: string;
}

function hasStringCode(value: unknown): value is ErrorWithCode {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof value.code === 'string'
  );
}

function hasName(value: unknown, name: string): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    value.name === name
  );
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const isBrowserOffline =
    typeof navigator !== 'undefined' && !navigator.onLine;

  if (hasStringCode(error)) {
    const rawCode = error.code;
    const message =
      typeof error.message === 'string' ? error.message : undefined;

    if (rawCode.startsWith('auth/')) {
      return new AppError(rawCode as AppErrorCode, message, { cause: error });
    }

    const normalizedCode = rawCode.startsWith('firestore/')
      ? rawCode.slice('firestore/'.length)
      : rawCode;

    switch (normalizedCode) {
      case 'permission-denied':
        return new AppError('permission-denied', message, { cause: error });
      case 'not-found':
        return new AppError('not-found', message, { cause: error });
      case 'unavailable':
        return new AppError('offline', message, { cause: error });
      case 'unauthenticated':
        return new AppError('unauthenticated', message, { cause: error });
      case 'invalid-argument':
        return new AppError('validation', message, { cause: error });
      default:
        break;
    }
  }

  if (hasName(error, 'ZodError')) {
    const message =
      error instanceof Error ? error.message : 'Validation failed';
    return new AppError('validation', message, { cause: error });
  }

  if (isBrowserOffline) {
    const message = error instanceof Error ? error.message : undefined;
    return new AppError('offline', message, { cause: error });
  }

  if (error instanceof Error) {
    const lowerMessage = error.message.toLowerCase();
    if (
      lowerMessage.includes('network') ||
      lowerMessage.includes('offline') ||
      lowerMessage.includes('failed to fetch')
    ) {
      return new AppError('offline', error.message, { cause: error });
    }

    return new AppError('unknown', error.message, { cause: error });
  }

  if (typeof error === 'string') {
    return new AppError('unknown', error, { cause: error });
  }

  return new AppError('unknown', undefined, { cause: error });
}
