import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestoreModule from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import { clearLocalFirestoreData } from './session';

vi.mock('firebase/firestore', async () => {
  const actual =
    await vi.importActual<typeof firestoreModule>('firebase/firestore');
  return {
    ...actual,
    terminate: vi.fn(),
    clearIndexedDbPersistence: vi.fn(),
  };
});

describe('clearLocalFirestoreData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('terminates Firestore and clears local IndexedDB persistence', async () => {
    vi.mocked(firestoreModule.terminate).mockResolvedValueOnce(undefined);
    vi.mocked(firestoreModule.clearIndexedDbPersistence).mockResolvedValueOnce(
      undefined,
    );

    await clearLocalFirestoreData();

    expect(firestoreModule.terminate).toHaveBeenCalledWith(db);
    expect(firestoreModule.clearIndexedDbPersistence).toHaveBeenCalledWith(db);
  });

  it('catches and logs errors without throwing when terminate fails', async () => {
    const error = new Error('Failed to terminate');
    vi.mocked(firestoreModule.terminate).mockRejectedValueOnce(error);
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

    await expect(clearLocalFirestoreData()).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to clear local Firestore cache',
      error,
    );
  });

  it('catches and logs errors without throwing when clearIndexedDbPersistence fails', async () => {
    const error = new Error('Failed to clear cache');
    vi.mocked(firestoreModule.terminate).mockResolvedValueOnce(undefined);
    vi.mocked(firestoreModule.clearIndexedDbPersistence).mockRejectedValueOnce(
      error,
    );
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

    await expect(clearLocalFirestoreData()).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to clear local Firestore cache',
      error,
    );
  });
});
