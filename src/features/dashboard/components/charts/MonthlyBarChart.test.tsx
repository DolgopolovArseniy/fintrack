import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { YearMonth } from '@/lib/dates';
import { MonthlyBarChart } from './MonthlyBarChart';

describe('MonthlyBarChart', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 500,
      height: 300,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const emptyHistory: Array<{
    month: YearMonth;
    label: string;
    income: number;
    expense: number;
  }> = [
    { month: '2026-05', label: 'May', income: 0, expense: 0 },
    { month: '2026-06', label: 'Jun', income: 0, expense: 0 },
    { month: '2026-07', label: 'Jul', income: 0, expense: 0 },
    { month: '2026-08', label: 'Aug', income: 0, expense: 0 },
    { month: '2026-09', label: 'Sep', income: 0, expense: 0 },
    { month: '2026-10', label: 'Oct', income: 0, expense: 0 },
  ];

  it('renders EmptyState when all monthly history values are 0', () => {
    render(<MonthlyBarChart monthlyHistory={emptyHistory} currency="USD" />);

    expect(
      screen.getByRole('heading', { name: /Income & Expense Trend/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Not enough data to display trend/i),
    ).toBeInTheDocument();
  });

  it('renders BarChart container, legend, and sr-only accessibility table when data exists', () => {
    const history: Array<{
      month: YearMonth;
      label: string;
      income: number;
      expense: number;
    }> = [
      { month: '2026-05', label: 'May', income: 50000, expense: 30000 },
      { month: '2026-06', label: 'Jun', income: 60000, expense: 40000 },
      { month: '2026-07', label: 'Jul', income: 0, expense: 0 },
      { month: '2026-08', label: 'Aug', income: 0, expense: 0 },
      { month: '2026-09', label: 'Sep', income: 0, expense: 0 },
      { month: '2026-10', label: 'Oct', income: 70000, expense: 45000 },
    ];

    const { container } = render(
      <MonthlyBarChart monthlyHistory={history} currency="USD" />,
    );

    // Header
    expect(
      screen.getByRole('heading', { name: /Income & Expense Trend/i }),
    ).toBeInTheDocument();

    // Region a11y
    const region = screen.getByRole('region', {
      name: /Income & Expense Trend/i,
    });
    expect(region).toBeInTheDocument();

    // Accessible sr-only table checking WCAG 2.1 AA
    const table = container.querySelector<HTMLTableElement>('table.sr-only');
    expect(table).toBeInTheDocument();
    if (table) {
      expect(
        within(table).getByText(/Income & Expense Trend/i),
      ).toBeInTheDocument();
      expect(table.textContent).toContain('May');
      expect(table.textContent).toContain('$500.00'); // income
      expect(table.textContent).toContain('$300.00'); // expense
      expect(table.textContent).toContain('$200.00'); // net: income - expense
    }
  });
});
