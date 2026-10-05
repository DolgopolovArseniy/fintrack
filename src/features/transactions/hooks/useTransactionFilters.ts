import * as React from 'react';
import { useSearchParams } from 'react-router';
import {
  currentYearMonth,
  isValidYearMonth,
  type YearMonth,
} from '@/lib/dates';

export interface TransactionFilterState {
  month: YearMonth;
  type: 'all' | 'expense' | 'income';
  categoryId: string;
  accountId: string;
  search: string;
}

export interface UseTransactionFiltersResult {
  filters: TransactionFilterState;
  setMonth: (month: YearMonth) => void;
  setType: (type: 'all' | 'expense' | 'income') => void;
  setCategory: (categoryId: string) => void;
  setAccount: (accountId: string) => void;
  setSearch: (search: string) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
}

/**
 * Hook to manage transaction filtering and month period state synchronized with URL search params.
 */
export function useTransactionFilters(): UseTransactionFiltersResult {
  const [searchParams, setSearchParams] = useSearchParams();

  const monthParam = searchParams.get('month');
  const month: YearMonth =
    monthParam && isValidYearMonth(monthParam)
      ? monthParam
      : currentYearMonth();

  const rawType = searchParams.get('type');
  const type: 'all' | 'expense' | 'income' =
    rawType === 'expense' || rawType === 'income' ? rawType : 'all';

  const categoryId = searchParams.get('categoryId') || 'all';
  const accountId = searchParams.get('accountId') || 'all';
  const search = searchParams.get('search') || '';

  const hasActiveFilters =
    type !== 'all' ||
    categoryId !== 'all' ||
    accountId !== 'all' ||
    search.trim().length > 0;

  const updateParams = React.useCallback(
    (mutator: (params: URLSearchParams) => void) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          mutator(next);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setMonth = React.useCallback(
    (newMonth: YearMonth) => {
      updateParams((params) => {
        if (newMonth === currentYearMonth()) {
          params.delete('month');
        } else {
          params.set('month', newMonth);
        }
      });
    },
    [updateParams],
  );

  const setType = React.useCallback(
    (newType: 'all' | 'expense' | 'income') => {
      updateParams((params) => {
        if (newType === 'all') {
          params.delete('type');
        } else {
          params.set('type', newType);
        }
      });
    },
    [updateParams],
  );

  const setCategory = React.useCallback(
    (newCategory: string) => {
      updateParams((params) => {
        if (!newCategory || newCategory === 'all') {
          params.delete('categoryId');
        } else {
          params.set('categoryId', newCategory);
        }
      });
    },
    [updateParams],
  );

  const setAccount = React.useCallback(
    (newAccount: string) => {
      updateParams((params) => {
        if (!newAccount || newAccount === 'all') {
          params.delete('accountId');
        } else {
          params.set('accountId', newAccount);
        }
      });
    },
    [updateParams],
  );

  const setSearch = React.useCallback(
    (newSearch: string) => {
      updateParams((params) => {
        const trimmed = newSearch.trim();
        if (!trimmed) {
          params.delete('search');
        } else {
          params.set('search', newSearch);
        }
      });
    },
    [updateParams],
  );

  const resetFilters = React.useCallback(() => {
    updateParams((params) => {
      params.delete('type');
      params.delete('categoryId');
      params.delete('accountId');
      params.delete('search');
    });
  }, [updateParams]);

  const filters: TransactionFilterState = React.useMemo(
    () => ({
      month,
      type,
      categoryId,
      accountId,
      search,
    }),
    [month, type, categoryId, accountId, search],
  );

  return {
    filters,
    setMonth,
    setType,
    setCategory,
    setAccount,
    setSearch,
    resetFilters,
    hasActiveFilters,
  };
}
