import * as React from 'react';
import { useAuth } from '@/features/auth';
import {
  useSubscription,
  type SubscriptionResult,
} from '@/hooks/useSubscription';
import { isValidYearMonth } from '@/lib/dates';
import { subscribeBudgetsByMonth } from '../repository';
import type { Budget } from '../schemas';

/**
 * Real-time subscription hook for the current authenticated user's budgets for a specific calendar month.
 */
export function useBudgets(month: string): SubscriptionResult<Budget[]> {
  const { user } = useAuth();
  const uid = user?.uid;

  const subscribe = React.useCallback(
    (
      onData: (budgets: Budget[]) => void,
      onError: (error: unknown) => void,
    ) => {
      if (!uid || !isValidYearMonth(month)) {
        onData([]);
        return () => {};
      }
      return subscribeBudgetsByMonth(uid, month, onData, onError);
    },
    [uid, month],
  );

  return useSubscription<Budget[]>(subscribe, [subscribe]);
}
