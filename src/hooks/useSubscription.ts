import * as React from 'react';
import { type AppError, toAppError } from '@/lib/errors';

export type SubscriptionState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: AppError };

export type SubscriptionResult<T> = SubscriptionState<T> & {
  retry: () => void;
};

export function useSubscription<T>(
  subscribe: (
    onData: (data: T) => void,
    onError: (error: unknown) => void,
  ) => () => void,
  deps: React.DependencyList,
): SubscriptionResult<T> {
  const [state, setState] = React.useState<SubscriptionState<T>>({
    status: 'loading',
  });
  const [retryCount, setRetryCount] = React.useState(0);

  const retry = React.useCallback(() => {
    setRetryCount((prev) => prev + 1);
  }, []);

  const [tracked, setTracked] = React.useState<{
    retryCount: number;
    deps: React.DependencyList;
  }>({
    retryCount,
    deps,
  });

  const haveDepsChanged =
    tracked.retryCount !== retryCount ||
    tracked.deps.length !== deps.length ||
    tracked.deps.some((dep, index) => !Object.is(dep, deps[index]));

  if (haveDepsChanged) {
    setTracked({ retryCount, deps });
    setState({ status: 'loading' });
  }

  React.useEffect(() => {
    let isActive = true;
    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = subscribe(
        (data: T) => {
          if (isActive) {
            setState({ status: 'success', data });
          }
        },
        (error: unknown) => {
          if (isActive) {
            setState({ status: 'error', error: toAppError(error) });
          }
        },
      );
    } catch (err: unknown) {
      queueMicrotask(() => {
        if (isActive) {
          setState({ status: 'error', error: toAppError(err) });
        }
      });
    }

    return () => {
      isActive = false;
      if (typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch {
          // Ignore errors during teardown
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount, ...deps]);

  return React.useMemo(() => ({ ...state, retry }), [state, retry]);
}
