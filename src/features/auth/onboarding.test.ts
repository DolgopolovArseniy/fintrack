import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OnboardingInput } from './types';
import { checkProfileExists, executeOnboardingBatch } from './onboarding';
import * as repository from './repository';

vi.mock('./repository', () => ({
  checkProfileDocExists: vi.fn(),
  createOnboardingBatch: vi.fn(),
}));

describe('onboarding unit tests', () => {
  const mockUid = 'user-test-123';
  const mockInput: OnboardingInput = {
    baseCurrency: 'EUR',
    locale: 'en',
    theme: 'system',
    displayName: 'Test User',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkProfileExists', () => {
    it('returns true when profile document exists in Firestore', async () => {
      vi.mocked(repository.checkProfileDocExists).mockResolvedValueOnce(true);

      const exists = await checkProfileExists(mockUid);

      expect(exists).toBe(true);
      expect(repository.checkProfileDocExists).toHaveBeenCalledWith(mockUid);
    });

    it('returns false when profile document does not exist in Firestore', async () => {
      vi.mocked(repository.checkProfileDocExists).mockResolvedValueOnce(false);

      const exists = await checkProfileExists(mockUid);

      expect(exists).toBe(false);
      expect(repository.checkProfileDocExists).toHaveBeenCalledWith(mockUid);
    });
  });

  describe('executeOnboardingBatch', () => {
    it('skips batch execution if user profile already exists (concurrency / multi-tab safeguard)', async () => {
      vi.mocked(repository.checkProfileDocExists).mockResolvedValueOnce(true);

      await executeOnboardingBatch(mockUid, mockInput);

      expect(repository.checkProfileDocExists).toHaveBeenCalledWith(mockUid);
      expect(repository.createOnboardingBatch).not.toHaveBeenCalled();
    });

    it('executes batch creation when profile does not exist', async () => {
      vi.mocked(repository.checkProfileDocExists).mockResolvedValueOnce(false);
      vi.mocked(repository.createOnboardingBatch).mockResolvedValueOnce(
        undefined,
      );

      await executeOnboardingBatch(mockUid, mockInput);

      expect(repository.checkProfileDocExists).toHaveBeenCalledWith(mockUid);
      expect(repository.createOnboardingBatch).toHaveBeenCalledWith(
        mockUid,
        mockInput,
      );
    });

    it('propagates error when createOnboardingBatch fails', async () => {
      vi.mocked(repository.checkProfileDocExists).mockResolvedValueOnce(false);
      vi.mocked(repository.createOnboardingBatch).mockRejectedValueOnce(
        new Error('Batch write failure'),
      );

      await expect(executeOnboardingBatch(mockUid, mockInput)).rejects.toThrow(
        'Batch write failure',
      );
    });
  });
});
