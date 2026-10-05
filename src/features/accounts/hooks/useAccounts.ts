import * as React from 'react';
import { useAuth } from '@/features/auth';
import {
  useSubscription,
  type SubscriptionResult,
} from '@/hooks/useSubscription';
import { subscribeAccounts } from '../repository';
import type { Account } from '../schemas';

/**
 * Real-time subscription hook for the current authenticated user's accounts.
 */
export function useAccounts(): SubscriptionResult<Account[]> {
  const { user } = useAuth();
  const uid = user?.uid;

  const subscribe = React.useCallback(
    (
      onData: (accounts: Account[]) => void,
      onError: (error: unknown) => void,
    ) => {
      if (!uid) {
        onData([]);
        return () => {};
      }
      return subscribeAccounts(uid, onData, onError);
    },
    [uid],
  );

  return useSubscription<Account[]>(subscribe, [subscribe]);
}
