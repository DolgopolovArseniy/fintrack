import * as React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSubscription } from './useSubscription';

describe('useSubscription', () => {
  it('starts with loading state and transitions to success when data is received', () => {
    let emitData: ((data: string) => void) | undefined;
    const unsubscribe = vi.fn();

    const { result } = renderHook(() =>
      useSubscription<string>((onData) => {
        emitData = onData;
        return unsubscribe;
      }, []),
    );

    expect(result.current.status).toBe('loading');

    act(() => {
      emitData?.('test-data');
    });

    expect(result.current.status).toBe('success');
    if (result.current.status === 'success') {
      expect(result.current.data).toBe('test-data');
    }
  });

  it('transitions to error state when an error is emitted', () => {
    let emitError: ((error: unknown) => void) | undefined;
    const unsubscribe = vi.fn();

    const { result } = renderHook(() =>
      useSubscription<string>((_onData, onError) => {
        emitError = onError;
        return unsubscribe;
      }, []),
    );

    act(() => {
      emitError?.(new Error('Fetch failed'));
    });

    expect(result.current.status).toBe('error');
    if (result.current.status === 'error') {
      expect(result.current.error.message).toBe('Fetch failed');
      expect(result.current.error.code).toBe('unknown');
    }
  });

  it('calls unsubscribe upon unmounting', () => {
    const unsubscribe = vi.fn();

    const { unmount } = renderHook(() =>
      useSubscription<string>(() => unsubscribe, []),
    );

    expect(unsubscribe).not.toHaveBeenCalled();
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes and resets to loading when dependencies change', () => {
    const unsub1 = vi.fn();
    const unsub2 = vi.fn();

    const { result, rerender } = renderHook(
      ({ currentDep }) =>
        useSubscription<string>(
          (onData) => {
            if (currentDep === 'month-1') {
              onData('data-1');
              return unsub1;
            }
            return unsub2;
          },
          [currentDep],
        ),
      { initialProps: { currentDep: 'month-1' } },
    );

    expect(result.current.status).toBe('success');
    if (result.current.status === 'success') {
      expect(result.current.data).toBe('data-1');
    }

    rerender({ currentDep: 'month-2' });

    expect(unsub1).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('loading');
  });

  it('ignores stale async updates after unmount or dep change', () => {
    let emitStaleData: ((data: string) => void) | undefined;

    const { result, unmount } = renderHook(() =>
      useSubscription<string>((onData) => {
        emitStaleData = onData;
        return () => {};
      }, []),
    );

    expect(result.current.status).toBe('loading');
    unmount();

    // Emitting data after unmount should not throw or change state
    act(() => {
      emitStaleData?.('late-data');
    });

    expect(result.current.status).toBe('loading');
  });

  it('re-runs subscription when retry is invoked', () => {
    let subscribeCallCount = 0;
    let emitError: ((error: unknown) => void) | undefined;
    let emitData: ((data: string) => void) | undefined;

    const { result } = renderHook(() =>
      useSubscription<string>((onData, onError) => {
        subscribeCallCount++;
        if (subscribeCallCount === 1) {
          emitError = onError;
        } else {
          emitData = onData;
        }
        return () => {};
      }, []),
    );

    act(() => {
      emitError?.(new Error('First fail'));
    });

    expect(result.current.status).toBe('error');
    expect(subscribeCallCount).toBe(1);

    act(() => {
      result.current.retry();
    });

    expect(subscribeCallCount).toBe(2);

    act(() => {
      emitData?.('Retry succeeded');
    });

    expect(result.current.status).toBe('success');
    if (result.current.status === 'success') {
      expect(result.current.data).toBe('Retry succeeded');
    }
  });

  it('handles synchronous exceptions thrown inside subscribe', async () => {
    const { result } = renderHook(() =>
      useSubscription<string>(() => {
        throw new Error('Sync explosion');
      }, []),
    );

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    if (result.current.status === 'error') {
      expect(result.current.error.message).toBe('Sync explosion');
    }
  });

  it('works correctly under React StrictMode simulation', () => {
    const unsubFirst = vi.fn();
    const unsubSecond = vi.fn();
    let callCount = 0;
    let latestEmit: ((data: string) => void) | undefined;

    const { result } = renderHook(
      () =>
        useSubscription<string>((onData) => {
          callCount++;
          latestEmit = onData;
          return callCount === 1 ? unsubFirst : unsubSecond;
        }, []),
      { wrapper: React.StrictMode },
    );

    // In StrictMode, effect runs twice in DEV
    // The second call is the active one
    act(() => {
      latestEmit?.('strict-mode-data');
    });

    expect(result.current.status).toBe('success');
    if (result.current.status === 'success') {
      expect(result.current.data).toBe('strict-mode-data');
    }
  });
});
