import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Category } from '@/features/categories';
import type { EnrichedBudget } from '../schemas';
import { BudgetCard } from './BudgetCard';

describe('BudgetCard', () => {
  const mockCategory: Category = {
    id: 'cat-groceries',
    type: 'expense',
    name: 'Groceries',
    icon: 'shoppingcart',
    color: 'emerald',
    archived: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const normalBudget: EnrichedBudget = {
    id: '2026-10_cat-groceries',
    categoryId: 'cat-groceries',
    month: '2026-10',
    limit: 2000000, // 20,000.00
    spent: 800000, // 8,000.00
    remaining: 1200000,
    overspent: 0,
    progress: 40,
    status: 'normal',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  const exceededBudget: EnrichedBudget = {
    id: '2026-10_cat-groceries',
    categoryId: 'cat-groceries',
    month: '2026-10',
    limit: 1000000, // 10,000.00
    spent: 1250000, // 12,500.00
    remaining: 0,
    overspent: 250000,
    progress: 125,
    status: 'exceeded',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  };

  it('renders normal budget with progress and remaining amount', () => {
    render(<BudgetCard budget={normalBudget} category={mockCategory} />);

    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('On track')).toBeInTheDocument();
  });

  it('renders exceeded budget with overspent label and exceeded badge', () => {
    render(<BudgetCard budget={exceededBudget} category={mockCategory} />);

    expect(screen.getByText('125%')).toBeInTheDocument();
    expect(screen.getByText('Exceeded (>100%)')).toBeInTheDocument();
  });

  it('triggers menu actions when clicked', async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();
    const handleViewTransactions = vi.fn();

    render(
      <BudgetCard
        budget={normalBudget}
        category={mockCategory}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onViewTransactions={handleViewTransactions}
      />,
    );

    const menuTrigger = screen.getByTestId(`budget-actions-${normalBudget.id}`);
    await user.click(menuTrigger);

    const editItem = screen.getByRole('menuitem', { name: /edit limit/i });
    await user.click(editItem);
    expect(handleEdit).toHaveBeenCalledWith(normalBudget);

    await user.click(menuTrigger);
    const viewTxItem = screen.getByRole('menuitem', {
      name: /view transactions/i,
    });
    await user.click(viewTxItem);
    expect(handleViewTransactions).toHaveBeenCalledWith(normalBudget);

    await user.click(menuTrigger);
    const deleteItem = screen.getByRole('menuitem', { name: /delete budget/i });
    await user.click(deleteItem);
    expect(handleDelete).toHaveBeenCalledWith(normalBudget);
  });
});
