import type { Account } from '@/features/accounts';
import type { Transaction } from '@/features/transactions';
import { sumByType } from '@/lib/aggregations';

export interface PercentageChangeResult {
  percent: number; // Absolute rounded percentage value (e.g. 15)
  direction: 'increase' | 'decrease' | 'neutral';
  isNewPeriod: boolean; // true if previous was 0 and current > 0
}

/**
 * Calculates percentage change between current and previous values.
 * Handles zeros, negative values, and non-finite numbers safely without division by zero.
 */
export function calculatePercentageChange(
  current: number,
  previous: number,
): PercentageChangeResult {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return {
      percent: 0,
      direction: 'neutral',
      isNewPeriod: false,
    };
  }

  if (previous === 0) {
    if (current > 0) {
      return {
        percent: 100,
        direction: 'increase',
        isNewPeriod: true,
      };
    }
    if (current < 0) {
      return {
        percent: 100,
        direction: 'decrease',
        isNewPeriod: false,
      };
    }
    return {
      percent: 0,
      direction: 'neutral',
      isNewPeriod: false,
    };
  }

  const diff = current - previous;
  if (diff === 0) {
    return {
      percent: 0,
      direction: 'neutral',
      isNewPeriod: false,
    };
  }

  const percent = Math.round((Math.abs(diff) / Math.abs(previous)) * 100);
  if (percent === 0) {
    return {
      percent: 0,
      direction: 'neutral',
      isNewPeriod: false,
    };
  }

  return {
    percent,
    direction: diff > 0 ? 'increase' : 'decrease',
    isNewPeriod: false,
  };
}

export interface DashboardMetrics {
  totalBalance: number;
  currentIncome: number;
  currentExpense: number;
  netSavings: number;
  savingsRate: number | null; // null if income <= 0
  incomeChange: PercentageChangeResult;
  expenseChange: PercentageChangeResult;
}

/**
 * Computes high-level financial KPI metrics for the dashboard:
 * - totalBalance: sum of balances of all active (non-archived) accounts
 * - currentIncome, currentExpense, netSavings for the selected month
 * - savingsRate: (netSavings / currentIncome * 100) or null if currentIncome <= 0
 * - incomeChange, expenseChange: dynamic change compared to previous month
 */
export function computeDashboardMetrics(params: {
  accounts: Account[];
  selectedMonthTxs: Transaction[];
  previousMonthTxs: Transaction[];
}): DashboardMetrics {
  const activeAccounts = params.accounts.filter((acc) => !acc.archived);
  const totalBalance = activeAccounts.reduce(
    (sum, acc) => sum + (acc.balance ?? 0),
    0,
  );

  const currentTotals = sumByType(params.selectedMonthTxs);
  const previousTotals = sumByType(params.previousMonthTxs);

  const currentIncome = currentTotals.income;
  const currentExpense = currentTotals.expense;
  const netSavings = currentTotals.net;

  let savingsRate: number | null = null;
  if (currentIncome > 0) {
    const rawRate = Math.round((netSavings / currentIncome) * 100);
    savingsRate = Object.is(rawRate, -0) ? 0 : rawRate;
  }

  const incomeChange = calculatePercentageChange(
    currentIncome,
    previousTotals.income,
  );
  const expenseChange = calculatePercentageChange(
    currentExpense,
    previousTotals.expense,
  );

  return {
    totalBalance,
    currentIncome,
    currentExpense,
    netSavings,
    savingsRate,
    incomeChange,
    expenseChange,
  };
}
