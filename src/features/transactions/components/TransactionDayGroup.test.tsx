import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Account } from '@/features/accounts';
import type { Category } from '@/features/categories';
import type { DayGroup } from '../hooks/useGroupedTransactions';
import type { Transaction } from '../schemas';
import { TransactionDayGroup } from './TransactionDayGroup';

const mockCategory: Category = {
  id: 'cat-groceries',
  type: 'expense',
  name: 'Groceries',
  icon: 'utensils',
  color: 'orange',
  archived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAccount: Account = {
  id: 'acc-main',
  type: 'card',
  name: 'Main Card',
  systemKey: 'main',
  balance: 50000,
  initialBalance: 50000,
  archived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTransactions: Transaction[] = [
  {
    id: 'tx-1',
    type: 'expense',
    amount: 1200,
    categoryId: 'cat-groceries',
    accountId: 'acc-main',
    date: '2026-10-15',
    note: 'Supermarket',
    createdAt: new Date('2026-10-15T10:00:00Z'),
    updatedAt: new Date('2026-10-15T10:00:00Z'),
  },
  {
    id: 'tx-2',
    type: 'income',
    amount: 5000,
    categoryId: 'cat-groceries',
    accountId: 'acc-main',
    date: '2026-10-15',
    note: 'Refund',
    createdAt: new Date('2026-10-15T12:00:00Z'),
    updatedAt: new Date('2026-10-15T12:00:00Z'),
  },
];

const mockDayGroup: DayGroup = {
  date: '2026-10-15',
  totalIncome: 5000,
  totalExpense: 1200,
  net: 3800,
  transactions: mockTransactions,
};

describe('TransactionDayGroup', () => {
  it('renders day header with formatted date and net amount', () => {
    const categoriesMap = new Map([['cat-groceries', mockCategory]]);
    const accountsMap = new Map([['acc-main', mockAccount]]);

    render(
      <TransactionDayGroup
        group={mockDayGroup}
        categoriesMap={categoriesMap}
        accountsMap={accountsMap}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByTestId('day-group-2026-10-15')).toBeInTheDocument();
    expect(screen.getByTestId('day-group-date')).toBeInTheDocument();
    expect(screen.getByTestId('day-group-net')).toBeInTheDocument();
    expect(screen.getByText(/38[.,]00/)).toBeInTheDocument();

    // Check items rendered
    expect(screen.getByTestId('transaction-item-tx-1')).toBeInTheDocument();
    expect(screen.getByTestId('transaction-item-tx-2')).toBeInTheDocument();
  });
});
