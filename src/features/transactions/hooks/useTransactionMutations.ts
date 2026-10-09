import * as React from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth';
import { useTranslation } from '@/lib/i18n';
import { AppError } from '@/lib/errors';
import {
  createTransaction as repoCreateTransaction,
  updateTransaction as repoUpdateTransaction,
  deleteTransaction as repoDeleteTransaction,
  restoreTransaction as repoRestoreTransaction,
  type TransactionUpdateInput,
} from '../repository';
import type { Transaction, TransactionInput } from '../schemas';

export interface UseTransactionMutationsResult {
  create: (input: TransactionInput) => Promise<string>;
  update: (
    txId: string,
    currentTx: Transaction,
    input: TransactionUpdateInput,
  ) => Promise<void>;
  remove: (tx: Transaction) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * Hook providing transaction CRUD mutations with Sonner toast notifications and Undo support.
 */
export function useTransactionMutations(): UseTransactionMutationsResult {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [submittingCount, setSubmittingCount] = React.useState(0);

  const uid = user?.uid;

  const requireUid = React.useCallback((): string => {
    if (!uid) {
      throw new AppError(
        'auth/unauthenticated',
        t('transactions.errors.unauthorized'),
      );
    }
    return uid;
  }, [uid, t]);

  const create = React.useCallback(
    async (input: TransactionInput): Promise<string> => {
      const currentUid = requireUid();
      setSubmittingCount((c) => c + 1);
      try {
        const id = await repoCreateTransaction(currentUid, input);
        toast.success(t('transactions.notifications.created'));
        return id;
      } catch (error) {
        toast.error(t('transactions.notifications.saveFailed'));
        throw error;
      } finally {
        setSubmittingCount((c) => Math.max(0, c - 1));
      }
    },
    [requireUid, t],
  );

  const update = React.useCallback(
    async (
      txId: string,
      currentTx: Transaction,
      input: TransactionUpdateInput,
    ): Promise<void> => {
      const currentUid = requireUid();
      setSubmittingCount((c) => c + 1);
      try {
        await repoUpdateTransaction(currentUid, txId, currentTx, input);
        toast.success(t('transactions.notifications.updated'));
      } catch (error) {
        toast.error(t('transactions.notifications.saveFailed'));
        throw error;
      } finally {
        setSubmittingCount((c) => Math.max(0, c - 1));
      }
    },
    [requireUid, t],
  );

  const remove = React.useCallback(
    async (tx: Transaction): Promise<void> => {
      const currentUid = requireUid();
      setSubmittingCount((c) => c + 1);
      try {
        await repoDeleteTransaction(currentUid, tx);
        toast(t('transactions.notifications.deleted'), {
          duration: 6000,
          action: {
            label: t('transactions.actions.undo'),
            onClick: () => {
              void (async () => {
                try {
                  await repoRestoreTransaction(currentUid, tx);
                  toast.success(t('transactions.notifications.restored'));
                } catch {
                  toast.error(t('transactions.notifications.saveFailed'));
                }
              })();
            },
          },
        });
      } catch (error) {
        toast.error(t('transactions.notifications.deleteFailed'));
        throw error;
      } finally {
        setSubmittingCount((c) => Math.max(0, c - 1));
      }
    },
    [requireUid, t],
  );

  return {
    create,
    update,
    remove,
    isSubmitting: submittingCount > 0,
  };
}
