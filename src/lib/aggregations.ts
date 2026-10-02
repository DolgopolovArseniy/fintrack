import { addMonths, IsoDate, toYearMonth, YearMonth } from './dates';
import { TransactionType } from './money';

export type AggTx = {
  type: TransactionType;
  amount: number;
  categoryId: string;
  date: IsoDate;
};

export type CategoryTotal = {
  categoryId: string;
  total: number;
};

export type MonthlyTotal = {
  month: YearMonth;
  income: number;
  expense: number;
};

export type TotalsByMonthOptions = {
  /**
   * If true, fills missing intermediate months between the earliest and latest months with zero amounts.
   * Default: false (only months with data are returned).
   */
  fillGaps?: boolean;
};

/**
 * Aggregates transactions into total income, expense, and net balance.
 * Amounts are non-negative integer minor units. Net = income - expense.
 */
export function sumByType(txs: readonly AggTx[]): {
  income: number;
  expense: number;
  net: number;
} {
  let income = 0;
  let expense = 0;

  for (const tx of txs) {
    if (tx.type === 'income') {
      income += tx.amount;
    } else {
      expense += tx.amount;
    }
  }

  const net = income - expense;
  return {
    income,
    expense,
    net: net === 0 ? 0 : net,
  };
}

/**
 * Aggregates totals by category for a given transaction type ('expense' | 'income').
 * Sorted descending by total. If totals are equal, sorts alphabetically by categoryId for deterministic order.
 */
export function totalsByCategory(
  txs: readonly AggTx[],
  type: TransactionType,
): CategoryTotal[] {
  const categoryMap = new Map<string, number>();

  for (const tx of txs) {
    if (tx.type === type) {
      categoryMap.set(
        tx.categoryId,
        (categoryMap.get(tx.categoryId) ?? 0) + tx.amount,
      );
    }
  }

  const result: CategoryTotal[] = [];
  for (const [categoryId, total] of categoryMap) {
    result.push({ categoryId, total });
  }

  result.sort((a, b) => {
    if (b.total !== a.total) {
      return b.total - a.total;
    }
    return a.categoryId.localeCompare(b.categoryId);
  });

  return result;
}

/**
 * Aggregates income and expense totals by calendar month ('YYYY-MM').
 * Sorted chronologically ascending.
 */
export function totalsByMonth(
  txs: readonly AggTx[],
  options?: TotalsByMonthOptions,
): MonthlyTotal[] {
  if (txs.length === 0) {
    return [];
  }

  const map = new Map<YearMonth, { income: number; expense: number }>();

  for (const tx of txs) {
    const month = toYearMonth(tx.date);
    let entry = map.get(month);
    if (!entry) {
      entry = { income: 0, expense: 0 };
      map.set(month, entry);
    }
    if (tx.type === 'income') {
      entry.income += tx.amount;
    } else {
      entry.expense += tx.amount;
    }
  }

  const months = Array.from(map.keys()).sort();

  if (!options?.fillGaps || months.length <= 1) {
    return months.map((month) => {
      const entry = map.get(month)!;
      return { month, income: entry.income, expense: entry.expense };
    });
  }

  const firstMonth = months[0]!;
  const lastMonth = months[months.length - 1]!;
  const result: MonthlyTotal[] = [];
  let currentMonth = firstMonth;

  while (currentMonth <= lastMonth) {
    const entry = map.get(currentMonth);
    result.push({
      month: currentMonth,
      income: entry ? entry.income : 0,
      expense: entry ? entry.expense : 0,
    });
    currentMonth = addMonths(currentMonth, 1);
  }

  return result;
}

/**
 * Collapses the tail of an array into an aggregated "Other" item if items exceed `n`.
 * If items.length <= n, returns a shallow copy of items without adding "Other".
 */
export function topNWithOther<T extends { total: number }>(
  items: readonly T[],
  n: number,
  otherFactory: (total: number) => T,
): T[] {
  if (n <= 0) {
    if (items.length === 0) {
      return [];
    }
    const otherTotal = items.reduce((acc, it) => acc + it.total, 0);
    return [otherFactory(otherTotal)];
  }

  if (items.length <= n) {
    return [...items];
  }

  const top = items.slice(0, n);
  const tail = items.slice(n);
  const otherTotal = tail.reduce((acc, it) => acc + it.total, 0);

  return [...top, otherFactory(otherTotal)];
}
