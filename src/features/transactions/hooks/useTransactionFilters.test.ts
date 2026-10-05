import { renderHook, act } from '@testing-library/react';
import * as React from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { currentYearMonth } from '@/lib/dates';
import { useTransactionFilters } from './useTransactionFilters';

function createWrapper(initialEntries = ['/transactions']) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(MemoryRouter, { initialEntries }, children);
  };
}

describe('useTransactionFilters', () => {
  it('initializes with default filters when no search params exist', () => {
    const { result } = renderHook(() => useTransactionFilters(), {
      wrapper: createWrapper(),
    });

    expect(result.current.filters.month).toBe(currentYearMonth());
    expect(result.current.filters.type).toBe('all');
    expect(result.current.filters.categoryId).toBe('all');
    expect(result.current.filters.accountId).toBe('all');
    expect(result.current.filters.search).toBe('');
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('reads initial values from search params', () => {
    const { result } = renderHook(() => useTransactionFilters(), {
      wrapper: createWrapper([
        '/transactions?month=2026-05&type=expense&categoryId=cat-1&accountId=acc-1&search=coffee',
      ]),
    });

    expect(result.current.filters.month).toBe('2026-05');
    expect(result.current.filters.type).toBe('expense');
    expect(result.current.filters.categoryId).toBe('cat-1');
    expect(result.current.filters.accountId).toBe('acc-1');
    expect(result.current.filters.search).toBe('coffee');
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('updates filters and toggles hasActiveFilters', () => {
    const { result } = renderHook(() => useTransactionFilters(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setType('income');
    });
    expect(result.current.filters.type).toBe('income');
    expect(result.current.hasActiveFilters).toBe(true);

    act(() => {
      result.current.setCategory('cat-salary');
    });
    expect(result.current.filters.categoryId).toBe('cat-salary');

    act(() => {
      result.current.setAccount('acc-bank');
    });
    expect(result.current.filters.accountId).toBe('acc-bank');

    act(() => {
      result.current.setSearch('bonus');
    });
    expect(result.current.filters.search).toBe('bonus');

    act(() => {
      result.current.setMonth('2026-08');
    });
    expect(result.current.filters.month).toBe('2026-08');
  });

  it('resets filters while retaining month', () => {
    const { result } = renderHook(() => useTransactionFilters(), {
      wrapper: createWrapper([
        '/transactions?month=2026-05&type=expense&categoryId=cat-1&search=test',
      ]),
    });

    expect(result.current.hasActiveFilters).toBe(true);

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.filters.month).toBe('2026-05');
    expect(result.current.filters.type).toBe('all');
    expect(result.current.filters.categoryId).toBe('all');
    expect(result.current.filters.accountId).toBe('all');
    expect(result.current.filters.search).toBe('');
    expect(result.current.hasActiveFilters).toBe(false);
  });
});
