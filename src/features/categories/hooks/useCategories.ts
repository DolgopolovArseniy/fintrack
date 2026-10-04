import * as React from 'react';
import { useAuth } from '@/features/auth';
import {
  useSubscription,
  type SubscriptionResult,
} from '@/hooks/useSubscription';
import { subscribeCategories } from '../repository';
import type { Category } from '../schemas';

/**
 * Real-time subscription hook for the current authenticated user's categories.
 */
export function useCategories(): SubscriptionResult<Category[]> {
  const { user } = useAuth();
  const uid = user?.uid;

  const subscribe = React.useCallback(
    (
      onData: (categories: Category[]) => void,
      onError: (error: unknown) => void,
    ) => {
      if (!uid) {
        onData([]);
        return () => {};
      }
      return subscribeCategories(uid, onData, onError);
    },
    [uid],
  );

  return useSubscription<Category[]>(subscribe, [subscribe]);
}
