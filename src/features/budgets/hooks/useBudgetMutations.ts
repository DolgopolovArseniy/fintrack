import * as React from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth';
import { useTranslation } from '@/lib/i18n';
import { AppError } from '@/lib/errors';
import {
  copyBudgetsFromMonth,
  createBudget as repoCreateBudget,
  deleteBudget as repoDeleteBudget,
  updateBudget as repoUpdateBudget,
  type CopyBudgetsOptions,
  type CopyBudgetsResult,
} from '../repository';
import type { BudgetInput, BudgetUpdateInput } from '../schemas';

export interface UseBudgetMutationsResult {
  createBudget: (input: BudgetInput) => Promise<string>;
  updateBudget: (budgetId: string, input: BudgetUpdateInput) => Promise<void>;
  deleteBudget: (budgetId: string) => Promise<void>;
  copyBudgets: (
    sourceMonth: string,
    targetMonth: string,
    options?: CopyBudgetsOptions,
  ) => Promise<CopyBudgetsResult>;
  isSubmitting: boolean;
  isCopying: boolean;
}

/**
 * Hook providing budget CRUD and batch copy mutations with Sonner toast notifications and busy states.
 */
export function useBudgetMutations(): UseBudgetMutationsResult {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [submittingCount, setSubmittingCount] = React.useState(0);
  const [copyingCount, setCopyingCount] = React.useState(0);

  const uid = user?.uid;

  const requireUid = React.useCallback((): string => {
    if (!uid) {
      throw new AppError('auth/unauthenticated', t('errors.unauthenticated'));
    }
    return uid;
  }, [uid, t]);

  const createBudget = React.useCallback(
    async (input: BudgetInput): Promise<string> => {
      const currentUid = requireUid();
      setSubmittingCount((c) => c + 1);
      try {
        const id = await repoCreateBudget(currentUid, input);
        toast.success(t('budgets.notifications.created'));
        return id;
      } catch (error) {
        toast.error(t('budgets.errors.saveFailed'));
        throw error;
      } finally {
        setSubmittingCount((c) => Math.max(0, c - 1));
      }
    },
    [requireUid, t],
  );

  const updateBudget = React.useCallback(
    async (budgetId: string, input: BudgetUpdateInput): Promise<void> => {
      const currentUid = requireUid();
      setSubmittingCount((c) => c + 1);
      try {
        await repoUpdateBudget(currentUid, budgetId, input);
        toast.success(t('budgets.notifications.updated'));
      } catch (error) {
        toast.error(t('budgets.errors.saveFailed'));
        throw error;
      } finally {
        setSubmittingCount((c) => Math.max(0, c - 1));
      }
    },
    [requireUid, t],
  );

  const deleteBudget = React.useCallback(
    async (budgetId: string): Promise<void> => {
      const currentUid = requireUid();
      setSubmittingCount((c) => c + 1);
      try {
        await repoDeleteBudget(currentUid, budgetId);
        toast.success(t('budgets.notifications.deleted'));
      } catch (error) {
        toast.error(t('budgets.errors.deleteFailed'));
        throw error;
      } finally {
        setSubmittingCount((c) => Math.max(0, c - 1));
      }
    },
    [requireUid, t],
  );

  const copyBudgets = React.useCallback(
    async (
      sourceMonth: string,
      targetMonth: string,
      options?: CopyBudgetsOptions,
    ): Promise<CopyBudgetsResult> => {
      const currentUid = requireUid();
      setCopyingCount((c) => c + 1);
      try {
        const result = await copyBudgetsFromMonth(
          currentUid,
          sourceMonth,
          targetMonth,
          options,
        );
        if (result.copiedCount > 0) {
          toast.success(
            t('budgets.notifications.copied', { count: result.copiedCount }),
          );
        } else {
          toast(t('budgets.notifications.copyNoop'));
        }
        return result;
      } catch (error) {
        toast.error(t('budgets.errors.copyFailed'));
        throw error;
      } finally {
        setCopyingCount((c) => Math.max(0, c - 1));
      }
    },
    [requireUid, t],
  );

  return {
    createBudget,
    updateBudget,
    deleteBudget,
    copyBudgets,
    isSubmitting: submittingCount > 0,
    isCopying: copyingCount > 0,
  };
}
