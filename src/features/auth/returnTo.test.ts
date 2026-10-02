import { describe, expect, it } from 'vitest';
import { ROUTES } from '@/app/routes';
import {
  buildLoginPath,
  isSafeReturnTo,
  resolveReturnTo,
  RETURN_TO_PARAM,
} from './returnTo';

describe('returnTo utilities', () => {
  describe('isSafeReturnTo', () => {
    it('accepts valid app paths', () => {
      expect(isSafeReturnTo('/app')).toBe(true);
      expect(isSafeReturnTo('/app/dashboard')).toBe(true);
      expect(isSafeReturnTo('/app/transactions?month=2026-09')).toBe(true);
      expect(isSafeReturnTo('/app/settings#profile')).toBe(true);
    });

    it('rejects falsy, null, or empty values', () => {
      expect(isSafeReturnTo(null)).toBe(false);
      expect(isSafeReturnTo(undefined)).toBe(false);
      expect(isSafeReturnTo('')).toBe(false);
    });

    it('rejects external URLs and schemes', () => {
      expect(isSafeReturnTo('https://evil.com')).toBe(false);
      expect(isSafeReturnTo('http://evil.com/app')).toBe(false);
      expect(isSafeReturnTo('//evil.com')).toBe(false);
      expect(isSafeReturnTo('javascript:alert(1)')).toBe(false);
    });

    it('rejects paths with backslashes and control characters', () => {
      expect(isSafeReturnTo('/\\evil.com')).toBe(false);
      expect(isSafeReturnTo('/app\\evil')).toBe(false);
      expect(isSafeReturnTo('/app\u0000evil')).toBe(false);
      expect(isSafeReturnTo('/app\nnewline')).toBe(false);
    });

    it('rejects non-app routes', () => {
      expect(isSafeReturnTo('/login')).toBe(false);
      expect(isSafeReturnTo('/register')).toBe(false);
      expect(isSafeReturnTo('/reset-password')).toBe(false);
      expect(isSafeReturnTo('/apple')).toBe(false);
    });
  });

  describe('resolveReturnTo', () => {
    it('returns target route when safe', () => {
      expect(resolveReturnTo('/app/transactions?month=2026-09')).toBe(
        '/app/transactions?month=2026-09',
      );
      expect(resolveReturnTo('/app')).toBe('/app');
    });

    it('falls back to ROUTES.dashboard for unsafe or empty paths', () => {
      expect(resolveReturnTo(null)).toBe(ROUTES.dashboard);
      expect(resolveReturnTo('')).toBe(ROUTES.dashboard);
      expect(resolveReturnTo('https://evil.com')).toBe(ROUTES.dashboard);
      expect(resolveReturnTo('/login')).toBe(ROUTES.dashboard);
    });
  });

  describe('buildLoginPath', () => {
    it('constructs login path with returnTo query param when from location is safe', () => {
      const result = buildLoginPath({
        pathname: '/app/transactions',
        search: '?month=2026-09',
      });

      expect(result).toBe(
        `${ROUTES.login}?${RETURN_TO_PARAM}=%2Fapp%2Ftransactions%3Fmonth%3D2026-09`,
      );
    });

    it('returns plain ROUTES.login when from location is not an app route', () => {
      expect(
        buildLoginPath({
          pathname: '/',
          search: '',
        }),
      ).toBe(ROUTES.login);

      expect(
        buildLoginPath({
          pathname: '/login',
          search: '',
        }),
      ).toBe(ROUTES.login);
    });
  });
});
