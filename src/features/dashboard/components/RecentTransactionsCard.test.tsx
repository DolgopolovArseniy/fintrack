import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { Account } from '@/features/accounts';
import type { Category } from '@/features/categories';
import type { Transaction } from '@/features/transactions';
import { RecentTransactionsCard } from './RecentTransactionsCard';

describe('RecentTransactionsCard', () => {
  const mockCategories: Category[] = [
    {
      id: 'cat-1',
      name: 'Groceries',
      type: 'expense',
      icon: 'shopping-bag',
      color: 'emerald',
      systemKey: 'shopping',
      archived: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
  ];

  const mockAccounts: Account[] = [
    {
      id: 'acc-1',
      name: 'Main Card',
      type: 'bank',
      balance: 100000,
      initialBalance: 0,
      archived: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
  ];

  const mockTransactions: Transaction[] = [
    {
      id: 'tx-1',
      type: 'expense',
      amount: 1500,
      accountId: 'acc-1',
      categoryId: 'cat-1',
      note: 'Supermarket shopping',
      date: '2026-10-15',
      createdAt: new Date('2026-10-15T12:00:00Z'),
      updatedAt: new Date('2026-10-15T12:00:00Z'),
    },
    {
      id: 'tx-2',
      type: 'income',
      amount: 50000,
      accountId: 'acc-1',
      categoryId: 'cat-1',
      note: 'Salary bonus',
      date: '2026-10-10',
      createdAt: new Date('2026-10-10T12:00:00Z'),
      updatedAt: new Date('2026-10-10T12:00:00Z'),
    },
  ];

  it('renders EmptyState and triggers onAddTransaction when empty', async () => {
    const user = userEvent.setup();
    const handleAdd = vi.fn();

    render(
      <MemoryRouter>
        <RecentTransactionsCard
          transactions={[]}
          onAddTransaction={handleAdd}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/No transactions for this month yet/i),
    ).toBeInTheDocument();

    const addBtn = screen.getByTestId('add-first-transaction-button');
    expect(addBtn).toBeInTheDocument();

    await user.click(addBtn);
    expect(handleAdd).toHaveBeenCalledTimes(1);
  });

  it('renders recent transactions list and constructs view-all link with selected month', () => {
    render(
      <MemoryRouter>
        <RecentTransactionsCard
          transactions={mockTransactions}
          categories={mockCategories}
          accounts={mockAccounts}
          selectedMonth="2026-10"
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /Recent Transactions/i }),
    ).toBeInTheDocument();

    expect(screen.getByText('Supermarket shopping')).toBeInTheDocument();
    expect(screen.getByText('Salary bonus')).toBeInTheDocument();

    const viewAllLink = screen.getByTestId('view-all-transactions-link');
    expect(viewAllLink).toHaveAttribute(
      'href',
      '/app/transactions?month=2026-10',
    );
  });

  it('limits rendering to maximum 5 transactions', () => {
    const sixTxs: Transaction[] = Array.from({ length: 6 }).map((_, i) => ({
      id: `tx-${i}`,
      type: 'expense',
      amount: (i + 1) * 1000,
      accountId: 'acc-1',
      categoryId: 'cat-1',
      note: `Transaction Note ${i + 1}`,
      date: '2026-10-10',
      createdAt: new Date('2026-10-10T12:00:00Z'),
      updatedAt: new Date('2026-10-10T12:00:00Z'),
    }));

    render(
      <MemoryRouter>
        <RecentTransactionsCard
          transactions={sixTxs}
          categories={mockCategories}
          accounts={mockAccounts}
          selectedMonth="2026-10"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Transaction Note 1')).toBeInTheDocument();
    expect(screen.getByText('Transaction Note 5')).toBeInTheDocument();
    expect(screen.queryByText('Transaction Note 6')).not.toBeInTheDocument();
  });
});
