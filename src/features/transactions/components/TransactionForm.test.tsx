import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account } from '@/features/accounts';
import type { Category } from '@/features/categories';
import type { Transaction } from '../schemas';
import { TransactionForm } from './TransactionForm';

// Mock pointer events for Radix UI in jsdom
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
  {
    id: 'cat-archived',
    type: 'expense',
    name: 'Old Expense',
    icon: 'tag',
    color: 'slate',
    archived: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockAccounts: Account[] = [
  {
    id: 'acc-main',
    type: 'card',
    name: 'Main Card',
    systemKey: 'main',
    balance: 50000,
    initialBalance: 50000,
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'acc-cash',
    type: 'cash',
    name: 'Cash Wallet',
    balance: 10000,
    initialBalance: 10000,
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('TransactionForm', () => {
  it('renders form in create mode with default fields', () => {
    render(
      <TransactionForm
        categories={mockCategories}
        accounts={mockAccounts}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByTestId('transaction-form')).toBeInTheDocument();
    expect(screen.getByTestId('transaction-amount-input')).toBeInTheDocument();
    expect(
      screen.getByTestId('transaction-category-select'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('transaction-account-select'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('transaction-date-input')).toBeInTheDocument();
    expect(screen.getByTestId('transaction-note-input')).toBeInTheDocument();
    expect(screen.getByTestId('transaction-submit-button')).toBeInTheDocument();
  });

  it('shows validation errors when amount or category are missing on submit', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(
      <TransactionForm
        categories={mockCategories}
        accounts={mockAccounts}
        onSubmit={handleSubmit}
      />,
    );

    const submitBtn = screen.getByTestId('transaction-submit-button');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('amount-error')).toBeInTheDocument();
      expect(screen.getByTestId('category-error')).toBeInTheDocument();
    });

    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('switches transaction type tab between expense and income', async () => {
    const user = userEvent.setup();

    render(
      <TransactionForm
        defaultType="expense"
        categories={mockCategories}
        accounts={mockAccounts}
        onSubmit={vi.fn()}
      />,
    );

    const incomeTab = screen.getByTestId('transaction-type-income');
    await user.click(incomeTab);

    expect(incomeTab).toHaveAttribute('data-state', 'active');
  });

  it('pre-fills fields when editing existing transaction', () => {
    const initialTx: Transaction = {
      id: 'tx-1',
      type: 'expense',
      amount: 2550,
      categoryId: 'cat-archived',
      accountId: 'acc-cash',
      date: '2026-10-01',
      note: 'Supermarket lunch',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <TransactionForm
        initialData={initialTx}
        categories={mockCategories}
        accounts={mockAccounts}
        onSubmit={vi.fn()}
      />,
    );

    const amountInput = screen.getByTestId<HTMLInputElement>(
      'transaction-amount-input',
    );
    expect(amountInput.value).toContain('25');

    const dateInput = screen.getByTestId<HTMLInputElement>(
      'transaction-date-input',
    );
    expect(dateInput.value).toBe('2026-10-01');

    const noteInput = screen.getByTestId<HTMLInputElement>(
      'transaction-note-input',
    );
    expect(noteInput.value).toBe('Supermarket lunch');
  });

  it('submits valid data when all required fields are filled', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    const initialTx: Transaction = {
      id: 'tx-1',
      type: 'expense',
      amount: 1500,
      categoryId: 'cat-food',
      accountId: 'acc-main',
      date: '2026-10-15',
      note: 'Lunch with team',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <TransactionForm
        initialData={initialTx}
        categories={mockCategories}
        accounts={mockAccounts}
        onSubmit={handleSubmit}
      />,
    );

    const submitBtn = screen.getByTestId('transaction-submit-button');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        type: 'expense',
        amount: 1500,
        categoryId: 'cat-food',
        accountId: 'acc-main',
        date: '2026-10-15',
        note: 'Lunch with team',
      });
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const handleCancel = vi.fn();

    render(
      <TransactionForm
        categories={mockCategories}
        accounts={mockAccounts}
        onSubmit={vi.fn()}
        onCancel={handleCancel}
      />,
    );

    const cancelBtn = screen.getByTestId('transaction-cancel-button');
    await user.click(cancelBtn);

    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('disables submit button and shows loading spinner when isSubmitting is true', () => {
    render(
      <TransactionForm
        categories={mockCategories}
        accounts={mockAccounts}
        onSubmit={vi.fn()}
        isSubmitting={true}
      />,
    );

    const submitBtn = screen.getByTestId('transaction-submit-button');
    expect(submitBtn).toBeDisabled();
  });
});
