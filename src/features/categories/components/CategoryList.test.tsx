import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Category } from '../schemas';
import { CategoryList } from './CategoryList';

describe('CategoryList', () => {
  const categories: Category[] = [
    {
      id: 'cat-1',
      type: 'expense',
      name: 'Groceries',
      icon: 'shoppingcart',
      color: 'emerald',
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'cat-2',
      type: 'expense',
      name: 'Transport',
      icon: 'car',
      color: 'sky',
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  it('renders emptyState when categories list is empty', () => {
    render(
      <CategoryList
        categories={[]}
        onEdit={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
        emptyState={<div>No categories available</div>}
      />,
    );

    expect(screen.getByText('No categories available')).toBeInTheDocument();
  });

  it('renders list of categories when categories are provided', () => {
    render(
      <CategoryList
        categories={categories}
        onEdit={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
      />,
    );

    expect(screen.getByTestId('category-list')).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.getByTestId('category-item-cat-1')).toBeInTheDocument();
    expect(screen.getByTestId('category-item-cat-2')).toBeInTheDocument();
  });
});
