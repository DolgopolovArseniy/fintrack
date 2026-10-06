import * as React from 'react';
import { useAccounts } from '@/features/accounts';
import { useAuth } from '@/features/auth';
import {
  subscribeTransactionsByDateRange,
  type Transaction,
} from '@/features/transactions';
import {
  useSubscription,
  type SubscriptionResult,
} from '@/hooks/useSubscription';
import {
  totalsByCategory,
  totalsByMonth,
  topNWithOther,
} from '@/lib/aggregations';
import {
  addMonths,
  isValidYearMonth,
  monthsBack,
  toYearMonth,
  type YearMonth,
} from '@/lib/dates';
import { useTranslation } from '@/lib/i18n';
import type { Locale } from '@/lib/locales';
import {
  computeDashboardMetrics,
  formatMonthShortLabel,
  type DashboardMetrics,
} from '../utils';

export interface DashboardData {
  metrics: DashboardMetrics;
  categoryExpenses: Array<{
    categoryId: string;
    total: number;
    percentage: number;
  }>;
  monthlyHistory: Array<{
    month: YearMonth;
    label: string;
    income: number;
    expense: number;
  }>;
  recentTransactions: Transaction[];
}

/**
 * Real-time subscription hook aggregating data required for the analytics dashboard:
 * - 6-month transaction window for trend analysis
 * - Selected month KPI metrics and percentage deltas
 * - Category expenses distribution (Top 5 + other)
 * - Recent 5 transactions of the selected month
 */
export function useDashboardData(
  selectedMonth: YearMonth,
): SubscriptionResult<DashboardData> {
  const { user } = useAuth();
  const uid = user?.uid;
  const { i18n } = useTranslation();
  const currentLocale: Locale = i18n.language?.startsWith('ru') ? 'ru' : 'en';

  const accountsResult = useAccounts();

  const sixMonths = React.useMemo(() => {
    if (!isValidYearMonth(selectedMonth)) {
      return [];
    }
    return monthsBack(selectedMonth, 6);
  }, [selectedMonth]);

  const startDate = sixMonths[0] ? `${sixMonths[0]}-01` : `${selectedMonth}-01`;
  const endDate = `${selectedMonth}-31`;

  const subscribeTransactions = React.useCallback(
    (
      onData: (transactions: Transaction[]) => void,
      onError: (error: unknown) => void,
    ) => {
      if (!uid || !isValidYearMonth(selectedMonth)) {
        onData([]);
        return () => {};
      }
      return subscribeTransactionsByDateRange(
        uid,
        startDate,
        endDate,
        onData,
        onError,
      );
    },
    [uid, selectedMonth, startDate, endDate],
  );

  const transactionsResult = useSubscription<Transaction[]>(
    subscribeTransactions,
    [subscribeTransactions],
  );

  const retry = React.useCallback(() => {
    accountsResult.retry();
    transactionsResult.retry();
  }, [accountsResult, transactionsResult]);

  return React.useMemo(() => {
    if (accountsResult.status === 'error') {
      return { status: 'error', error: accountsResult.error, retry };
    }
    if (transactionsResult.status === 'error') {
      return { status: 'error', error: transactionsResult.error, retry };
    }
    if (
      accountsResult.status === 'loading' ||
      transactionsResult.status === 'loading'
    ) {
      return { status: 'loading', retry };
    }

    const allTxs = transactionsResult.data;
    const selectedMonthTxs = allTxs.filter(
      (tx) => toYearMonth(tx.date) === selectedMonth,
    );
    const previousMonth = addMonths(selectedMonth, -1);
    const previousMonthTxs = allTxs.filter(
      (tx) => toYearMonth(tx.date) === previousMonth,
    );

    const metrics = computeDashboardMetrics({
      accounts: accountsResult.data,
      selectedMonthTxs,
      previousMonthTxs,
    });

    const expenses = totalsByCategory(selectedMonthTxs, 'expense');
    const totalExpense = expenses.reduce((sum, item) => sum + item.total, 0);
    const top5 = topNWithOther(expenses, 5, (otherTotal) => ({
      categoryId: '__other__',
      total: otherTotal,
    }));
    const categoryExpenses = top5.map((item) => ({
      categoryId: item.categoryId,
      total: item.total,
      percentage:
        totalExpense > 0 ? Math.round((item.total / totalExpense) * 100) : 0,
    }));

    const monthlyMap = new Map(totalsByMonth(allTxs).map((m) => [m.month, m]));
    const monthlyHistory = sixMonths.map((month) => {
      const entry = monthlyMap.get(month);
      return {
        month,
        label: formatMonthShortLabel(month, currentLocale),
        income: entry?.income ?? 0,
        expense: entry?.expense ?? 0,
      };
    });

    const recentTransactions = selectedMonthTxs.slice(0, 5);

    return {
      status: 'success',
      data: {
        metrics,
        categoryExpenses,
        monthlyHistory,
        recentTransactions,
      },
      retry,
    };
  }, [
    accountsResult,
    transactionsResult,
    selectedMonth,
    sixMonths,
    currentLocale,
    retry,
  ]);
}
