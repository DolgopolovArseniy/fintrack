import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkProfileDocExists,
  createOnboardingBatch,
  getUserProfile,
  subscribeUserProfile,
} from './repository';
import type { OnboardingInput } from './types';
import { DEFAULT_CATEGORIES } from '@/features/categories';

const {
  mockDoc,
  mockCollection,
  mockGetDoc,
  mockOnSnapshot,
  mockServerTimestamp,
  mockWriteBatch,
  mockBatchSet,
  mockBatchCommit,
} = vi.hoisted(() => {
  const mockBatchSet = vi.fn();
  const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
  return {
    mockDoc: vi.fn((_db, ...parts: string[]) => ({
      path: parts.join('/'),
      id: parts[parts.length - 1] ?? 'auto-id',
    })),
    mockCollection: vi.fn((_db, ...parts: string[]) => ({
      path: parts.join('/'),
    })),
    mockGetDoc: vi.fn(),
    mockOnSnapshot:
      vi.fn<
        (
          ref: unknown,
          onNext: (snapshot: unknown) => void,
          onError?: (error: unknown) => void,
        ) => () => void
      >(),
    mockServerTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' })),
    mockWriteBatch: vi.fn(() => ({
      set: mockBatchSet,
      commit: mockBatchCommit,
    })),
    mockBatchSet,
    mockBatchCommit,
  };
});

vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
  collection: mockCollection,
  getDoc: mockGetDoc,
  onSnapshot: mockOnSnapshot,
  serverTimestamp: mockServerTimestamp,
  writeBatch: mockWriteBatch,
}));

vi.mock('@/lib/firebase', () => ({
  db: { _type: 'mockFirestoreDb' },
}));

describe('auth repository unit tests', () => {
  const mockUid = 'user-abc-123';
  const mockInput: OnboardingInput = {
    baseCurrency: 'EUR',
    locale: 'en',
    theme: 'dark',
    displayName: '  Alice Wonderland  ',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkProfileDocExists', () => {
    it('returns true when document snapshot exists', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
      });

      const exists = await checkProfileDocExists(mockUid);
      expect(exists).toBe(true);
      expect(mockGetDoc).toHaveBeenCalled();
    });

    it('returns false when document snapshot does not exist', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const exists = await checkProfileDocExists(mockUid);
      expect(exists).toBe(false);
    });

    it('translates errors to AppError', async () => {
      mockGetDoc.mockRejectedValueOnce({
        code: 'permission-denied',
        message: 'Permission denied',
      });

      await expect(checkProfileDocExists(mockUid)).rejects.toMatchObject({
        code: 'permission-denied',
      });
    });
  });

  describe('getUserProfile', () => {
    it('returns null when document does not exist', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const profile = await getUserProfile(mockUid);
      expect(profile).toBeNull();
    });

    it('returns parsed profile when document exists', async () => {
      const mockDate = new Date('2026-01-01T00:00:00Z');
      mockGetDoc.mockResolvedValueOnce({
        id: mockUid,
        exists: () => true,
        data: () => ({
          baseCurrency: 'USD',
          locale: 'en',
          theme: 'system',
          schemaVersion: 1,
          createdAt: { toDate: () => mockDate },
          updatedAt: { toDate: () => mockDate },
        }),
      });

      const profile = await getUserProfile(mockUid);
      expect(profile).toEqual({
        id: mockUid,
        baseCurrency: 'USD',
        locale: 'en',
        theme: 'system',
        schemaVersion: 1,
        createdAt: mockDate,
        updatedAt: mockDate,
      });
    });
  });

  describe('subscribeUserProfile', () => {
    it('subscribes to snapshot and emits profile', () => {
      const mockUnsubscribe = vi.fn();
      let snapshotCallback: ((snapshot: unknown) => void) | null = null;

      mockOnSnapshot.mockImplementation((_ref, onNext) => {
        snapshotCallback = onNext;
        return mockUnsubscribe;
      });

      const onData = vi.fn();
      const onError = vi.fn();

      const unsubscribe = subscribeUserProfile(mockUid, onData, onError);

      expect(mockOnSnapshot).toHaveBeenCalled();

      // Trigger with null doc
      snapshotCallback!({
        exists: () => false,
      });
      expect(onData).toHaveBeenCalledWith(null);

      // Trigger with valid doc
      const mockDate = new Date('2026-01-01T00:00:00Z');
      snapshotCallback!({
        id: mockUid,
        exists: () => true,
        data: () => ({
          baseCurrency: 'EUR',
          locale: 'ru',
          theme: 'light',
          schemaVersion: 1,
          displayName: 'Test',
          createdAt: { toDate: () => mockDate },
          updatedAt: { toDate: () => mockDate },
        }),
      });

      expect(onData).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockUid,
          baseCurrency: 'EUR',
          locale: 'ru',
          theme: 'light',
          displayName: 'Test',
        }),
      );

      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('emits error through callback when onSnapshot fails', () => {
      mockOnSnapshot.mockImplementation((_ref, _onNext, onError) => {
        if (onError) {
          onError({ code: 'unavailable', message: 'Offline' });
        }
        return () => {};
      });

      const onData = vi.fn();
      const onError = vi.fn();

      subscribeUserProfile(mockUid, onData, onError);

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'offline',
        }),
      );
    });
  });

  describe('createOnboardingBatch', () => {
    it('creates exactly 13 documents in a single atomic batch', async () => {
      await createOnboardingBatch(mockUid, mockInput);

      expect(mockWriteBatch).toHaveBeenCalledTimes(1);
      // 1 profile + 1 account + 11 categories = 13 documents
      expect(mockBatchSet).toHaveBeenCalledTimes(13);
      expect(mockBatchCommit).toHaveBeenCalledTimes(1);

      // Verify profile write (trimmed displayName)
      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.objectContaining({ path: `users/${mockUid}` }),
        expect.objectContaining({
          baseCurrency: 'EUR',
          locale: 'en',
          theme: 'dark',
          schemaVersion: 1,
          displayName: 'Alice Wonderland',
        }),
      );

      // Verify account write (systemKey: 'main')
      expect(mockBatchSet).toHaveBeenCalledWith(
        expect.objectContaining({ path: `users/${mockUid}/accounts/main` }),
        expect.objectContaining({
          type: 'cash',
          balance: 0,
          initialBalance: 0,
          archived: false,
          systemKey: 'main',
        }),
      );

      // Verify all 11 default categories are written
      for (const cat of DEFAULT_CATEGORIES) {
        expect(mockBatchSet).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            type: cat.type,
            icon: cat.icon,
            color: cat.color,
            archived: false,
            systemKey: cat.systemKey,
          }),
        );
      }
    });

    it('omits displayName when undefined or whitespace', async () => {
      await createOnboardingBatch(mockUid, {
        baseCurrency: 'USD',
        locale: 'en',
        theme: 'system',
        displayName: '   ',
      });

      const firstCall = mockBatchSet.mock.calls[0];
      const writtenProfile = (firstCall?.[1] ?? {}) as Record<string, unknown>;
      expect(writtenProfile).not.toHaveProperty('displayName');
    });
  });
});
