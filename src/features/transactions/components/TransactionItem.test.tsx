import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Account } from '@/features/accounts';
import type { Category } from '@/features/categories';
import type { Transaction } from '../schemas';
import { TransactionItem } from './TransactionItem';

const mockCategory: Category = {
  id: 'cat-coffee',
  type: 'expense',
  name: 'Coffee & Snacks',
  icon: 'coffee',
  color: 'amber',
  archived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAccount: Account = {
  id: 'acc-card',
  type: 'card',
  name: 'Tinkoff Black',
  balance: 20000,
  initialBalance: 20000,
  archived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTransaction: Transaction = {
  id: 'tx-100',
  type: 'expense',
  amount: 450,
  categoryId: 'cat-coffee',
  accountId: 'acc-card',
  date: '2026-10-15',
  note: 'Cappuccino with croissant',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('TransactionItem', () => {
  it('renders category, note, account, and amount', () => {
    render(
      <TransactionItem
        transaction={mockTransaction}
        category={mockCategory}
        account={mockAccount}
      />,
    );

    expect(screen.getByTestId('transaction-item-tx-100')).toBeInTheDocument();
    expect(screen.getByText('Coffee & Snacks')).toBeInTheDocument();
    expect(screen.getByText('Cappuccino with croissant')).toBeInTheDocument();
    expect(screen.getByText('Tinkoff Black')).toBeInTheDocument();
    expect(screen.getByText(/4[.,]50/)).toBeInTheDocument();
  });

  it('renders actions menu and triggers onEdit and onDelete', async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();

    render(
      <TransactionItem
        transaction={mockTransaction}
        category={mockCategory}
        account={mockAccount}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />,
    );

    const menuTrigger = screen.getByTestId('transaction-actions-tx-100');
    expect(menuTrigger).toBeInTheDocument();

    await user.click(menuTrigger);

    const editBtn = screen.getByRole('menuitem', { name: /edit/i });
    expect(editBtn).toBeInTheDocument();
    await user.click(editBtn);
    expect(handleEdit).toHaveBeenCalledWith(mockTransaction);

    await user.click(menuTrigger);
    const deleteBtn = screen.getByRole('menuitem', { name: /delete/i });
    expect(deleteBtn).toBeInTheDocument();
    await user.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledWith(mockTransaction);
  });

  it('does not render actions trigger when onEdit and onDelete are omitted', () => {
    render(
      <TransactionItem
        transaction={mockTransaction}
        category={mockCategory}
        account={mockAccount}
      />,
    );

    expect(
      screen.queryByTestId('transaction-actions-tx-100'),
    ).not.toBeInTheDocument();
  });
});
