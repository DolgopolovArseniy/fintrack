import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account } from '@/features/accounts';
import type { Category } from '@/features/categories';
import type { TransactionFilterState } from '../hooks/useTransactionFilters';
import { TransactionFilters } from './TransactionFilters';

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
});

const mockCategories: Category[] = [
  {
    id: 'cat-food',
    type: 'expense',
    name: 'Food & Groceries',
    icon: 'utensils',
    color: 'orange',
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'cat-salary',
    type: 'income',
    name: 'Salary',
    icon: 'wallet',
    color: 'emerald',
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockAccounts: Account[] = [
  {
    id: 'acc-card',
    type: 'card',
    name: 'Tinkoff Card',
    balance: 10000,
    initialBalance: 10000,
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const defaultFilters: TransactionFilterState = {
  month: '2026-10',
  type: 'all',
  categoryId: 'all',
  accountId: 'all',
  search: '',
};

describe('TransactionFilters', () => {
  it('renders search input and type tabs', () => {
    render(
      <TransactionFilters
        filters={defaultFilters}
        onTypeChange={vi.fn()}
        onCategoryChange={vi.fn()}
        onAccountChange={vi.fn()}
        onSearchChange={vi.fn()}
        onReset={vi.fn()}
        hasActiveFilters={false}
        categories={mockCategories}
        accounts={mockAccounts}
      />,
    );

    expect(screen.getByTestId('transaction-filters')).toBeInTheDocument();
    expect(screen.getByTestId('filter-search-input')).toBeInTheDocument();
    expect(screen.getByTestId('filter-type-all')).toBeInTheDocument();
    expect(screen.getByTestId('filter-type-expense')).toBeInTheDocument();
    expect(screen.getByTestId('filter-type-income')).toBeInTheDocument();
  });

  it('triggers onTypeChange when clicking expense tab', async () => {
    const user = userEvent.setup();
    const handleTypeChange = vi.fn();

    render(
      <TransactionFilters
        filters={defaultFilters}
        onTypeChange={handleTypeChange}
        onCategoryChange={vi.fn()}
        onAccountChange={vi.fn()}
        onSearchChange={vi.fn()}
        onReset={vi.fn()}
        hasActiveFilters={false}
        categories={mockCategories}
        accounts={mockAccounts}
      />,
    );

    await user.click(screen.getByTestId('filter-type-expense'));
    expect(handleTypeChange).toHaveBeenCalledWith('expense');
  });

  it('triggers onSearchChange when typing in search input', async () => {
    const user = userEvent.setup();
    const handleSearchChange = vi.fn();

    render(
      <TransactionFilters
        filters={defaultFilters}
        onTypeChange={vi.fn()}
        onCategoryChange={vi.fn()}
        onAccountChange={vi.fn()}
        onSearchChange={handleSearchChange}
        onReset={vi.fn()}
        hasActiveFilters={false}
        categories={mockCategories}
        accounts={mockAccounts}
      />,
    );

    const input = screen.getByTestId('filter-search-input');
    await user.type(input, 'coffee');
    expect(handleSearchChange).toHaveBeenCalled();
  });

  it('shows reset button when hasActiveFilters is true and calls onReset', async () => {
    const user = userEvent.setup();
    const handleReset = vi.fn();

    render(
      <TransactionFilters
        filters={{ ...defaultFilters, type: 'expense', search: 'groceries' }}
        onTypeChange={vi.fn()}
        onCategoryChange={vi.fn()}
        onAccountChange={vi.fn()}
        onSearchChange={vi.fn()}
        onReset={handleReset}
        hasActiveFilters={true}
        categories={mockCategories}
        accounts={mockAccounts}
      />,
    );

    const resetBtn = screen.getByTestId('filter-reset-button');
    expect(resetBtn).toBeInTheDocument();
    await user.click(resetBtn);
    expect(handleReset).toHaveBeenCalledTimes(1);
  });

  it('renders active filter badge on mobile button when filters are active', () => {
    render(
      <TransactionFilters
        filters={{ ...defaultFilters, type: 'expense', search: 'lunch' }}
        onTypeChange={vi.fn()}
        onCategoryChange={vi.fn()}
        onAccountChange={vi.fn()}
        onSearchChange={vi.fn()}
        onReset={vi.fn()}
        hasActiveFilters={true}
        categories={mockCategories}
        accounts={mockAccounts}
      />,
    );

    const badge = screen.getByTestId('active-filters-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('2');
  });
});
