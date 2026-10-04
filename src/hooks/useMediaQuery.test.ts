import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useMediaQuery } from './useMediaQuery';

describe('useMediaQuery', () => {
  let listeners: ((e: MediaQueryListEvent) => void)[] = [];
  const originalMatchMedia = window.matchMedia.bind(window);

  beforeEach(() => {
    listeners = [];
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  let currentMatches = false;

  function setupMatchMedia(matches: boolean) {
    currentMatches = matches;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      get matches() {
        return currentMatches;
      },
      media: query,
      onchange: null,
      addEventListener: vi.fn(
        (event: string, callback: (e: MediaQueryListEvent) => void) => {
          if (event === 'change') {
            listeners.push(callback);
          }
        },
      ),
      removeEventListener: vi.fn(
        (event: string, callback: (e: MediaQueryListEvent) => void) => {
          if (event === 'change') {
            listeners = listeners.filter((cb) => cb !== callback);
          }
        },
      ),
      dispatchEvent: vi.fn(),
    }));
  }

  it('returns initial matching state correctly when true', () => {
    setupMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(true);
  });

  it('returns initial matching state correctly when false', () => {
    setupMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);
  });

  it('updates state when media query change event fires', () => {
    setupMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);

    act(() => {
      currentMatches = true;
      for (const listener of listeners) {
        listener({ matches: true } as MediaQueryListEvent);
      }
    });

    expect(result.current).toBe(true);
  });

  it('cleans up event listener on unmount', () => {
    setupMatchMedia(true);
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(listeners.length).toBe(1);

    unmount();
    expect(listeners.length).toBe(0);
  });
});
