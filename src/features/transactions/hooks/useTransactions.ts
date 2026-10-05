import * as React from 'react';
import { useAuth } from '@/features/auth';
import {
  useSubscription,
  type SubscriptionResult,
} from '@/hooks/useSubscription';
import { isValidYearMonth, type YearMonth } from '@/lib/dates';
import { subscribeTransactionsByMonth } from '../repository';
import type { Transaction } from '../schemas';

/**
 * Real-time subscription hook for the current user's transactions within a specific month.
 */
export function useTransactions(
  month: YearMonth,
): SubscriptionResult<Transaction[]> {
  const { user } = useAuth();
  const uid = user?.uid;

  const subscribe = React.useCallback(
    (
      onData: (transactions: Transaction[]) => void,
      onError: (error: unknown) => void,
    ) => {
      if (!uid || !isValidYearMonth(month)) {
        onData([]);
        return () => {};
      }
      return subscribeTransactionsByMonth(uid, month, onData, onError);
    },
    [uid, month],
  );

  return useSubscription<Transaction[]>(subscribe, [subscribe]);
}
