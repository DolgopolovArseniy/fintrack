import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Category } from '@/features/categories';
import type { EnrichedBudget } from '../schemas';
import { BudgetList } from './BudgetList';

describe('BudgetList', () => {
  const mockCategories: Category[] = [
    {
      id: 'cat-food',
      type: 'expense',
      name: 'Food',
      icon: 'utensils',
      color: 'orange',
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'cat-transport',
      type: 'expense',
      name: 'Transport',
      icon: 'car',
      color: 'sky',
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'cat-ent',
      type: 'expense',
      name: 'Entertainment',
      icon: 'film',
      color: 'violet',
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const sampleBudgets: EnrichedBudget[] = [
    {
      id: '2026-10_cat-food',
      categoryId: 'cat-food',
      month: '2026-10',
      limit: 1000000,
      spent: 400000,
      remaining: 600000,
      overspent: 0,
      progress: 40,
      status: 'normal',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2026-10_cat-transport',
      categoryId: 'cat-transport',
      month: '2026-10',
      limit: 500000,
      spent: 600000,
      remaining: 0,
      overspent: 100000,
      progress: 120,
      status: 'exceeded',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2026-10_cat-ent',
      categoryId: 'cat-ent',
      month: '2026-10',
      limit: 300000,
      spent: 270000,
      remaining: 30000,
      overspent: 0,
      progress: 90,
      status: 'warning',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  it('renders cards sorted by status priority (exceeded -> warning -> normal)', () => {
    render(
      <BudgetList
        budgets={sampleBudgets}
        categories={mockCategories}
        onEdit={vi.fn()}
      />,
    );

    const cards = screen.getAllByTestId('budget-card');
    expect(cards).toHaveLength(3);

    // 1st: Transport (exceeded)
    expect(cards[0]).toHaveAttribute('data-category-id', 'cat-transport');
    // 2nd: Entertainment (warning)
    expect(cards[1]).toHaveAttribute('data-category-id', 'cat-ent');
    // 3rd: Food (normal)
    expect(cards[2]).toHaveAttribute('data-category-id', 'cat-food');
  });

  it('returns null when budgets array is empty', () => {
    const { container } = render(
      <BudgetList budgets={[]} categories={mockCategories} />,
    );

    expect(container.firstChild).toBeNull();
  });
});
