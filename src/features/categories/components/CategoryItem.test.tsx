import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Category } from '../schemas';
import { CategoryItem } from './CategoryItem';

describe('CategoryItem', () => {
  const expenseCategory: Category = {
    id: 'cat-expense-1',
    type: 'expense',
    name: 'Groceries',
    icon: 'shoppingcart',
    color: 'emerald',
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const archivedCategory: Category = {
    id: 'cat-archived-1',
    type: 'expense',
    name: 'Old Gadgets',
    icon: 'tv',
    color: 'slate',
    archived: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const systemCategory: Category = {
    id: 'cat-system-1',
    type: 'income',
    systemKey: 'salary',
    icon: 'wallet',
    color: 'emerald',
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('renders category name and icon', () => {
    render(
      <CategoryItem
        category={expenseCategory}
        onEdit={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
      />,
    );

    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(
      screen.getByTestId('category-item-cat-expense-1'),
    ).toBeInTheDocument();
  });

  it('renders localized name for system category without custom name', () => {
    render(
      <CategoryItem
        category={systemCategory}
        onEdit={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
      />,
    );

    expect(screen.getByText('Salary')).toBeInTheDocument();
  });

  it('renders archived indicator for archived category', () => {
    render(
      <CategoryItem
        category={archivedCategory}
        onEdit={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
      />,
    );

    expect(screen.getByText('Old Gadgets')).toBeInTheDocument();
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('calls onEdit when Edit option is clicked in dropdown', async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    render(
      <CategoryItem
        category={expenseCategory}
        onEdit={handleEdit}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
      />,
    );

    const trigger = screen.getByTestId('category-actions-cat-expense-1');
    await user.click(trigger);

    const editBtn = screen.getByRole('menuitem', { name: /edit/i });
    await user.click(editBtn);

    expect(handleEdit).toHaveBeenCalledTimes(1);
    expect(handleEdit).toHaveBeenCalledWith(expenseCategory);
  });

  it('calls onArchive when Archive option is clicked for active category', async () => {
    const user = userEvent.setup();
    const handleArchive = vi.fn();
    render(
      <CategoryItem
        category={expenseCategory}
        onEdit={vi.fn()}
        onArchive={handleArchive}
        onUnarchive={vi.fn()}
      />,
    );

    const trigger = screen.getByTestId('category-actions-cat-expense-1');
    await user.click(trigger);

    const archiveBtn = screen.getByRole('menuitem', { name: /archive/i });
    await user.click(archiveBtn);

    expect(handleArchive).toHaveBeenCalledTimes(1);
    expect(handleArchive).toHaveBeenCalledWith(expenseCategory);
  });

  it('calls onUnarchive when Restore option is clicked for archived category', async () => {
    const user = userEvent.setup();
    const handleUnarchive = vi.fn();
    render(
      <CategoryItem
        category={archivedCategory}
        onEdit={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={handleUnarchive}
      />,
    );

    const trigger = screen.getByTestId('category-actions-cat-archived-1');
    await user.click(trigger);

    const unarchiveBtn = screen.getByRole('menuitem', { name: /restore/i });
    await user.click(unarchiveBtn);

    expect(handleUnarchive).toHaveBeenCalledTimes(1);
    expect(handleUnarchive).toHaveBeenCalledWith(archivedCategory);
  });
});
