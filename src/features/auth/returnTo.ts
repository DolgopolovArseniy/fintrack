import { ROUTES } from '@/app/routes';

export const RETURN_TO_PARAM = 'returnTo';

/**
 * Checks whether a character code represents an ASCII control character (0-31 or 127).
 */
function hasControlCharacters(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if ((code >= 0 && code <= 31) || code === 127) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether a given string is a safe internal application return URL.
 * Accepts only paths under /app, without domain/protocol manipulation, backslashes, or control characters.
 */
export function isSafeReturnTo(
  value: string | null | undefined,
): value is string {
  if (!value || typeof value !== 'string') {
    return false;
  }

  // Reject backslashes and ASCII control characters
  if (value.includes('\\') || hasControlCharacters(value)) {
    return false;
  }

  // Must strictly start with /app (and not protocol-relative //)
  if (!value.startsWith('/app') || value.startsWith('//')) {
    return false;
  }

  try {
    const parsed = new URL(value, 'http://localhost');
    if (parsed.origin !== 'http://localhost') {
      return false;
    }

    const pathname = parsed.pathname;
    return pathname === '/app' || pathname.startsWith('/app/');
  } catch {
    return false;
  }
}

/**
 * Resolves a returnTo parameter to a safe route, defaulting to dashboard.
 */
export function resolveReturnTo(value: string | null | undefined): string {
  if (isSafeReturnTo(value)) {
    return value;
  }
  return ROUTES.dashboard;
}

/**
 * Builds the login path including a returnTo query parameter if the from path is safe.
 */
export function buildLoginPath(from: {
  pathname: string;
  search: string;
}): string {
  const fullPath = `${from.pathname}${from.search}`;
  if (isSafeReturnTo(fullPath)) {
    return `${ROUTES.login}?${RETURN_TO_PARAM}=${encodeURIComponent(fullPath)}`;
  }
  return ROUTES.login;
}
