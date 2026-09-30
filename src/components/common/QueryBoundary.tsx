import * as React from 'react';
import type { SubscriptionResult } from '@/hooks/useSubscription';
import { ErrorState } from './ErrorState';
import { LoadingSkeleton } from './LoadingSkeleton';

export interface QueryBoundaryProps<T> {
  state: SubscriptionResult<T>;
  isEmpty?: (data: T) => boolean;
  skeleton?: React.ReactNode;
  empty: React.ReactNode;
  children: (data: T) => React.ReactNode;
}

export function QueryBoundary<T>({
  state,
  isEmpty,
  skeleton,
  empty,
  children,
}: QueryBoundaryProps<T>) {
  if (state.status === 'loading') {
    return <>{skeleton ?? <LoadingSkeleton variant="list" />}</>;
  }

  if (state.status === 'error') {
    return <ErrorState error={state.error} onRetry={state.retry} />;
  }

  const isDataEmpty = isEmpty
    ? isEmpty(state.data)
    : Array.isArray(state.data) && state.data.length === 0;

  if (isDataEmpty) {
    return <>{empty}</>;
  }

  return <>{children(state.data)}</>;
}
