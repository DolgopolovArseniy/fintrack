import * as React from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth';
import { useTranslation } from '@/lib/i18n';
import { AppError } from '@/lib/errors';
import {
  archiveCategory as repoArchiveCategory,
  createCategory as repoCreateCategory,
  unarchiveCategory as repoUnarchiveCategory,
  updateCategory as repoUpdateCategory,
  type CategoryUpdateInput,
} from '../repository';
import type { CategoryInput } from '../schemas';

export interface UseCategoryMutationsResult {
  createCategory: (input: CategoryInput) => Promise<string>;
  updateCategory: (id: string, input: CategoryUpdateInput) => Promise<void>;
  archiveCategory: (id: string) => Promise<void>;
  unarchiveCategory: (id: string) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * Hook providing category CRUD and archiving mutations with toast notifications and busy state.
 */
export function useCategoryMutations(): UseCategoryMutationsResult {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [submittingCount, setSubmittingCount] = React.useState(0);

  const uid = user?.uid;

  const requireUid = React.useCallback((): string => {
    if (!uid) {
      throw new AppError(
        'auth/unauthenticated',
        t('categories.errors.unauthorized'),
      );
    }
    return uid;
  }, [uid, t]);

  const createCategory = React.useCallback(
    async (input: CategoryInput): Promise<string> => {
      const currentUid = requireUid();
      setSubmittingCount((c) => c + 1);
      try {
        const id = await repoCreateCategory(currentUid, input);
        toast.success(t('categories.notifications.created'));
        return id;
      } catch (error) {
        toast.error(t('categories.errors.saveFailed'));
        throw error;
      } finally {
        setSubmittingCount((c) => Math.max(0, c - 1));
      }
    },
    [requireUid, t],
  );

  const updateCategory = React.useCallback(
    async (id: string, input: CategoryUpdateInput): Promise<void> => {
      const currentUid = requireUid();
      setSubmittingCount((c) => c + 1);
      try {
        await repoUpdateCategory(currentUid, id, input);
        toast.success(t('categories.notifications.updated'));
      } catch (error) {
        toast.error(t('categories.errors.saveFailed'));
        throw error;
      } finally {
        setSubmittingCount((c) => Math.max(0, c - 1));
      }
    },
    [requireUid, t],
  );

  const archiveCategory = React.useCallback(
    async (id: string): Promise<void> => {
      const currentUid = requireUid();
      setSubmittingCount((c) => c + 1);
      try {
        await repoArchiveCategory(currentUid, id);
        toast.success(t('categories.notifications.archived'));
      } catch (error) {
        toast.error(t('categories.errors.saveFailed'));
        throw error;
      } finally {
        setSubmittingCount((c) => Math.max(0, c - 1));
      }
    },
    [requireUid, t],
  );

  const unarchiveCategory = React.useCallback(
    async (id: string): Promise<void> => {
      const currentUid = requireUid();
      setSubmittingCount((c) => c + 1);
      try {
        await repoUnarchiveCategory(currentUid, id);
        toast.success(t('categories.notifications.unarchived'));
      } catch (error) {
        toast.error(t('categories.errors.saveFailed'));
        throw error;
      } finally {
        setSubmittingCount((c) => Math.max(0, c - 1));
      }
    },
    [requireUid, t],
  );

  return {
    createCategory,
    updateCategory,
    archiveCategory,
    unarchiveCategory,
    isSubmitting: submittingCount > 0,
  };
}
