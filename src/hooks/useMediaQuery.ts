import * as React from 'react';

/**
 * Custom hook to track whether a CSS media query matches using React's useSyncExternalStore.
 *
 * @param query - The CSS media query string, e.g. '(min-width: 768px)'
 * @returns boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (callback: () => void) => {
      if (
        typeof window === 'undefined' ||
        typeof window.matchMedia !== 'function'
      ) {
        return () => {};
      }

      const mediaQueryList = window.matchMedia(query);
      if (typeof mediaQueryList.addEventListener === 'function') {
        mediaQueryList.addEventListener('change', callback);
        return () => mediaQueryList.removeEventListener('change', callback);
      } else if (
        typeof (
          mediaQueryList as unknown as {
            addListener?: (cb: () => void) => void;
          }
        ).addListener === 'function'
      ) {
        (
          mediaQueryList as unknown as {
            addListener: (cb: () => void) => void;
          }
        ).addListener(callback);
        return () => {
          (
            mediaQueryList as unknown as {
              removeListener: (cb: () => void) => void;
            }
          ).removeListener(callback);
        };
      }
      return () => {};
    },
    [query],
  );

  const getSnapshot = React.useCallback(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return false;
    }
    return window.matchMedia(query).matches;
  }, [query]);

  const getServerSnapshot = () => false;

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
