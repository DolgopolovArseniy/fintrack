import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Category } from '@/features/categories';
import { ExpenseDonutChart } from './ExpenseDonutChart';

describe('ExpenseDonutChart', () => {
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

  const mockCategories: Category[] = [
    {
      id: 'cat-food',
      name: 'Food & Dining',
      type: 'expense',
      icon: 'utensils',
      color: 'orange',
      systemKey: 'food',
      archived: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    {
      id: 'cat-transport',
      name: 'Transportation',
      type: 'expense',
      icon: 'car',
      color: 'sky',
      systemKey: 'transport',
      archived: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
  ];

  it('renders EmptyState when categoryExpenses is empty', () => {
    render(
      <ExpenseDonutChart
        categoryExpenses={[]}
        categories={mockCategories}
        currency="USD"
      />,
    );

    expect(
      screen.getByRole('heading', { name: /Expenses by Category/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No expenses recorded this month/i),
    ).toBeInTheDocument();
  });

  it('renders EmptyState when all category totals are 0', () => {
    render(
      <ExpenseDonutChart
        categoryExpenses={[{ categoryId: 'cat-food', total: 0, percentage: 0 }]}
        categories={mockCategories}
        currency="USD"
      />,
    );

    expect(
      screen.getByText(/No expenses recorded this month/i),
    ).toBeInTheDocument();
  });

  it('renders chart, legend, and sr-only accessibility table when data is present', () => {
    const expenses = [
      { categoryId: 'cat-food', total: 30000, percentage: 75 },
      { categoryId: '__other__', total: 10000, percentage: 25 },
    ];

    const { container } = render(
      <ExpenseDonutChart
        categoryExpenses={expenses}
        categories={mockCategories}
        currency="USD"
      />,
    );

    // Header
    expect(
      screen.getByRole('heading', { name: /Expenses by Category/i }),
    ).toBeInTheDocument();

    // Region a11y
    const region = screen.getByRole('region', {
      name: /Expenses by Category/i,
    });
    expect(region).toBeInTheDocument();

    // sr-only table checking WCAG 2.1 AA
    const table = container.querySelector<HTMLTableElement>('table.sr-only');
    expect(table).toBeInTheDocument();
    if (table) {
      expect(
        within(table).getByText(/Expenses by Category/i),
      ).toBeInTheDocument();
      expect(table.textContent).toContain('Food & Dining');
      expect(table.textContent).toContain('$300.00');
      expect(table.textContent).toContain('75%');
      expect(table.textContent).toContain('Other');
      expect(table.textContent).toContain('$100.00');
      expect(table.textContent).toContain('25%');
    }

    // Legend & center total
    expect(screen.getAllByText('Food & Dining').length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText('Other').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('$400.00').length).toBeGreaterThanOrEqual(1);
  });

  it('updates center label when hovering over a category item in the legend', () => {
    const expenses = [
      { categoryId: 'cat-food', total: 30000, percentage: 75 },
      { categoryId: '__other__', total: 10000, percentage: 25 },
    ];

    render(
      <ExpenseDonutChart
        categoryExpenses={expenses}
        categories={mockCategories}
        currency="USD"
      />,
    );

    // Initially shows Total expenses
    expect(screen.getByText(/Total expenses/i)).toBeInTheDocument();
    expect(screen.getByText('$400.00')).toBeInTheDocument();

    // Hover over Food & Dining legend item
    const foodMatches = screen.getAllByText('Food & Dining');
    const foodLegend = foodMatches[foodMatches.length - 1]?.closest('div');
    if (foodLegend) {
      fireEvent.mouseEnter(foodLegend);
      // Center now shows Food & Dining, amount, and percentage
      expect(
        screen.getAllByText('Food & Dining').length,
      ).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('$300.00').length).toBeGreaterThanOrEqual(2);

      fireEvent.mouseLeave(foodLegend);
      // Reverts back to Total expenses
      expect(screen.getByText(/Total expenses/i)).toBeInTheDocument();
      expect(screen.getAllByText('$400.00').length).toBeGreaterThanOrEqual(1);
    }
  });
});
