import * as React from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth';
import { useTranslation } from '@/lib/i18n';
import { AppError } from '@/lib/errors';
import { formatMoney } from '@/lib/money';
import { isSupportedLocale, DEFAULT_LOCALE, type Locale } from '@/lib/locales';
import type { CurrencyCode } from '@/lib/currencies';
import {
  createAccount as repoCreateAccount,
  updateAccount as repoUpdateAccount,
  archiveAccount as repoArchiveAccount,
  unarchiveAccount as repoUnarchiveAccount,
  recalculateAccountBalance as repoRecalculateAccountBalance,
  type RecalculateBalanceResult,
} from '../repository';
import type { Account, AccountInput, AccountUpdateInput } from '../schemas';

export interface UseAccountMutationsResult {
  createAccount: (input: AccountInput) => Promise<string>;
  updateAccount: (
    id: string,
    currentAccount: Account,
    input: AccountUpdateInput,
  ) => Promise<void>;
  archiveAccount: (id: string) => Promise<void>;
  unarchiveAccount: (id: string) => Promise<void>;
  recalculateBalance: (id: string) => Promise<RecalculateBalanceResult>;
  isSubmitting: boolean;
  isRecalculating: boolean;
}

/**
 * Hook providing account CRUD, archiving, and balance recalculation mutations with toast notifications and busy state.
 */
export function useAccountMutations(): UseAccountMutationsResult {
  const { user, profile } = useAuth();
  const { t, i18n } = useTranslation();
  const [submittingCount, setSubmittingCount] = React.useState(0);
  const [recalculatingCount, setRecalculatingCount] = React.useState(0);

  const uid = user?.uid;

  const requireUid = React.useCallback((): string => {
    if (!uid) {
      throw new AppError(
        'auth/unauthenticated',
        t('accounts.errors.unauthorized', {
          defaultValue: 'You must be signed in to perform this action',
        }),
      );
    }
    return uid;
  }, [uid, t]);

  const createAccount = React.useCallback(
    async (input: AccountInput): Promise<string> => {
      const currentUid = requireUid();
      setSubmittingCount((c) => c + 1);
      try {
        const id = await repoCreateAccount(currentUid, input);
        toast.success(
          t('accounts.notifications.created', {
            defaultValue: 'Account created successfully',
          }),
        );
        return id;
      } catch (error) {
        toast.error(
          t('accounts.errors.saveFailed', {
            defaultValue: 'Failed to save account. Please try again.',
          }),
        );
        throw error;
      } finally {
        setSubmittingCount((c) => Math.max(0, c - 1));
      }
    },
    [requireUid, t],
  );

  const updateAccount = React.useCallback(
    async (
      id: string,
      currentAccount: Account,
      input: AccountUpdateInput,
    ): Promise<void> => {
      const currentUid = requireUid();
      setSubmittingCount((c) => c + 1);
      try {
        await repoUpdateAccount(currentUid, id, currentAccount, input);
        toast.success(
          t('accounts.notifications.updated', {
            defaultValue: 'Account updated successfully',
          }),
        );
      } catch (error) {
        toast.error(
          t('accounts.errors.saveFailed', {
            defaultValue: 'Failed to save account. Please try again.',
          }),
        );
        throw error;
      } finally {
        setSubmittingCount((c) => Math.max(0, c - 1));
      }
    },
    [requireUid, t],
  );

  const archiveAccount = React.useCallback(
    async (id: string): Promise<void> => {
      const currentUid = requireUid();
      setSubmittingCount((c) => c + 1);
      try {
        await repoArchiveAccount(currentUid, id);
        toast.success(
          t('accounts.notifications.archived', {
            defaultValue: 'Account archived',
          }),
        );
      } catch (error) {
        toast.error(
          t('accounts.errors.saveFailed', {
            defaultValue: 'Failed to save account. Please try again.',
          }),
        );
        throw error;
      } finally {
        setSubmittingCount((c) => Math.max(0, c - 1));
      }
    },
    [requireUid, t],
  );

  const unarchiveAccount = React.useCallback(
    async (id: string): Promise<void> => {
      const currentUid = requireUid();
      setSubmittingCount((c) => c + 1);
      try {
        await repoUnarchiveAccount(currentUid, id);
        toast.success(
          t('accounts.notifications.unarchived', {
            defaultValue: 'Account restored',
          }),
        );
      } catch (error) {
        toast.error(
          t('accounts.errors.saveFailed', {
            defaultValue: 'Failed to save account. Please try again.',
          }),
        );
        throw error;
      } finally {
        setSubmittingCount((c) => Math.max(0, c - 1));
      }
    },
    [requireUid, t],
  );

  const recalculateBalance = React.useCallback(
    async (id: string): Promise<RecalculateBalanceResult> => {
      const currentUid = requireUid();
      setRecalculatingCount((c) => c + 1);
      try {
        const result = await repoRecalculateAccountBalance(currentUid, id);
        const currentLang = i18n?.resolvedLanguage ?? i18n?.language ?? '';
        const locale: Locale = isSupportedLocale(currentLang)
          ? currentLang
          : (profile?.locale ?? DEFAULT_LOCALE);
        const currency: CurrencyCode = profile?.baseCurrency ?? 'USD';

        if (result.delta === 0) {
          toast.success(
            t('accounts.notifications.recalculateSuccess', {
              count: result.transactionCount,
              defaultValue: `Balance is accurate (${result.transactionCount} transactions processed)`,
            }),
          );
        } else {
          const oldFormatted = formatMoney(result.previousBalance, {
            locale,
            currency,
          });
          const newFormatted = formatMoney(result.newBalance, {
            locale,
            currency,
          });
          toast.success(
            t('accounts.notifications.recalculateAdjusted', {
              count: result.transactionCount,
              oldBalance: oldFormatted,
              newBalance: newFormatted,
              defaultValue: `Balance adjusted: from ${oldFormatted} to ${newFormatted} (${result.transactionCount} transactions processed)`,
            }),
          );
        }

        return result;
      } catch (error) {
        toast.error(
          t('accounts.errors.recalculateFailed', {
            defaultValue: 'Failed to recalculate account balance',
          }),
        );
        throw error;
      } finally {
        setRecalculatingCount((c) => Math.max(0, c - 1));
      }
    },
    [requireUid, t, i18n, profile],
  );

  return {
    createAccount,
    updateAccount,
    archiveAccount,
    unarchiveAccount,
    recalculateBalance,
    isSubmitting: submittingCount > 0,
    isRecalculating: recalculatingCount > 0,
  };
}
