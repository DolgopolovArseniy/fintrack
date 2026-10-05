import * as React from 'react';
import { compareIsoDates } from '@/lib/dates';
import type { Transaction } from '../schemas';
import type { TransactionFilterState } from './useTransactionFilters';

export interface DayGroup {
  date: string;
  totalIncome: number;
  totalExpense: number;
  net: number;
  transactions: Transaction[];
}

export interface UseGroupedTransactionsResult {
  groups: DayGroup[];
  totalIncome: number;
  totalExpense: number;
  net: number;
  filteredCount: number;
}

/**
 * Filters transactions by type, category, account, and search term,
 * groups them by date (descending), and computes daily and overall totals.
 */
export function useGroupedTransactions(
  transactions: Transaction[],
  filters: TransactionFilterState,
): UseGroupedTransactionsResult {
  return React.useMemo(() => {
    const searchNormalized = filters.search.trim().toLowerCase();

    // 1. Filter
    const filtered = transactions.filter((tx) => {
      if (filters.type !== 'all' && tx.type !== filters.type) {
        return false;
      }
      if (
        filters.categoryId !== 'all' &&
        tx.categoryId !== filters.categoryId
      ) {
        return false;
      }
      if (filters.accountId !== 'all' && tx.accountId !== filters.accountId) {
        return false;
      }
      if (searchNormalized) {
        if (!tx.note || !tx.note.toLowerCase().includes(searchNormalized)) {
          return false;
        }
      }
      return true;
    });

    // 2. Group by date
    const groupsMap = new Map<string, Transaction[]>();
    for (const tx of filtered) {
      const list = groupsMap.get(tx.date);
      if (list) {
        list.push(tx);
      } else {
        groupsMap.set(tx.date, [tx]);
      }
    }

    // 3. Sort dates descending
    const sortedDates = Array.from(groupsMap.keys()).sort((a, b) =>
      compareIsoDates(b, a),
    );

    const groups: DayGroup[] = sortedDates.map((date) => {
      const dayTxs = groupsMap.get(date) ?? [];

      // Sort within day by createdAt descending
      dayTxs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      let dayIncome = 0;
      let dayExpense = 0;

      for (const tx of dayTxs) {
        if (tx.type === 'income') {
          dayIncome += tx.amount;
        } else if (tx.type === 'expense') {
          dayExpense += tx.amount;
        }
      }

      return {
        date,
        totalIncome: dayIncome,
        totalExpense: dayExpense,
        net: dayIncome - dayExpense,
        transactions: dayTxs,
      };
    });

    let totalIncome = 0;
    let totalExpense = 0;
    for (const group of groups) {
      totalIncome += group.totalIncome;
      totalExpense += group.totalExpense;
    }

    return {
      groups,
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense,
      filteredCount: filtered.length,
    };
  }, [
    transactions,
    filters.type,
    filters.categoryId,
    filters.accountId,
    filters.search,
  ]);
}
