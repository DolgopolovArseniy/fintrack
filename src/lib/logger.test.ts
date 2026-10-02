import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('warn', () => {
    it('calls console.warn with [FinTrack] prefix when context is not provided', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      logger.warn('Something suspicious happened');

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        '[FinTrack] Something suspicious happened',
      );
    });

    it('calls console.warn with prefix and context when context is provided', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorContext = { code: 'DOC_MISSING', docId: 'tx-123' };

      logger.warn('Corrupt document encountered', errorContext);

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        '[FinTrack] Corrupt document encountered',
        errorContext,
      );
    });

    it('logs null and primitive context correctly', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      logger.warn('Null context test', null);
      expect(warnSpy).toHaveBeenCalledWith(
        '[FinTrack] Null context test',
        null,
      );

      logger.warn('Number context test', 42);
      expect(warnSpy).toHaveBeenCalledWith(
        '[FinTrack] Number context test',
        42,
      );
    });
  });

  describe('error', () => {
    it('calls console.error with [FinTrack] prefix when context is not provided', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      logger.error('Critical database error');

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        '[FinTrack] Critical database error',
      );
    });

    it('calls console.error with prefix and context when context is provided', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const err = new Error('Network timeout');

      logger.error('Failed to sync data', err);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        '[FinTrack] Failed to sync data',
        err,
      );
    });
  });
});
