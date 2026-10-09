import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccounts, type Account } from '@/features/accounts';
import { useAuth } from '@/features/auth';
import { useCategories, type Category } from '@/features/categories';
import {
  useTransactionMutations,
  useTransactions,
  type Transaction,
} from '@/features/transactions';
import { AppError } from '@/lib/errors';
import { TransactionsPage } from './TransactionsPage';

vi.mock('@/features/transactions', async () => {
  const actual = await vi.importActual('@/features/transactions');
  return {
    ...actual,
    useTransactions: vi.fn(),
    useTransactionMutations: vi.fn(),
  };
});

vi.mock('@/features/categories', async () => {
  const actual = await vi.importActual('@/features/categories');
  return {
    ...actual,
    useCategories: vi.fn(),
  };
});

vi.mock('@/features/accounts', async () => {
  const actual = await vi.importActual('@/features/accounts');
  return {
    ...actual,
    useAccounts: vi.fn(),
  };
});

vi.mock('@/features/auth', async () => {
  const actual = await vi.importActual('@/features/auth');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

const mockCategories: Category[] = [
  {
    id: 'cat-food',
    type: 'expense',
    name: 'Food & Groceries',
    icon: 'utensils',
    color: 'orange',
    archived: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: 'cat-salary',
    type: 'income',
    name: 'Salary',
    icon: 'wallet',
    color: 'emerald',
    archived: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
];

const mockAccounts: Account[] = [
  {
    id: 'acc-main',
    type: 'cash',
    name: 'Main Cash',
    systemKey: 'main',
    balance: 50000,
    initialBalance: 50000,
    archived: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
];

const mockTransactions: Transaction[] = [
  {
    id: 'tx-1',
    type: 'expense',
    amount: 2500, // 25.00
    accountId: 'acc-main',
    categoryId: 'cat-food',
    date: '2026-10-15',
    note: 'Supermarket dinner',
    createdAt: new Date('2026-10-15T12:00:00Z'),
    updatedAt: new Date('2026-10-15T12:00:00Z'),
  },
  {
    id: 'tx-2',
    type: 'income',
    amount: 10000, // 100.00
    accountId: 'acc-main',
    categoryId: 'cat-salary',
    date: '2026-10-10',
    note: 'Consulting bonus',
    createdAt: new Date('2026-10-10T09:00:00Z'),
    updatedAt: new Date('2026-10-10T09:00:00Z'),
  },
];

describe('TransactionsPage', () => {
  const mockCreate = vi.fn();
  const mockUpdate = vi.fn();
  const mockRemove = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches:
        query.includes('min-width: 768px') ||
        query.includes('min-width: 640px'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: {
        uid: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
        emailVerified: true,
        isAnonymous: false,
        providerIds: ['password'],
      },
      profileStatus: 'ready',
      profile: {
        id: 'test-user-id',
        displayName: 'Test User',
        baseCurrency: 'USD',
        locale: 'en',
        theme: 'system',
        schemaVersion: 1,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      },
      refreshUser: vi.fn(),
      refreshProfile: vi.fn(),
    });

    vi.mocked(useCategories).mockReturnValue({
      status: 'success',
      data: mockCategories,
      retry: vi.fn(),
    });

    vi.mocked(useAccounts).mockReturnValue({
      status: 'success',
      data: mockAccounts,
      retry: vi.fn(),
    });

    vi.mocked(useTransactionMutations).mockReturnValue({
      create: mockCreate,
      update: mockUpdate,
      remove: mockRemove,
      isSubmitting: false,
    });
  });

  const renderPage = (initialUrl = '/app/transactions') => {
    return render(
      <MemoryRouter initialEntries={[initialUrl]}>
        <Routes>
          <Route path="/app/transactions" element={<TransactionsPage />} />
        </Routes>
      </MemoryRouter>,
    );
  };

  it('renders loading state when transactions are loading', () => {
    vi.mocked(useTransactions).mockReturnValue({
      status: 'loading',
      retry: vi.fn(),
    });

    renderPage();

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders error state with retry button when subscription fails', () => {
    const mockRetry = vi.fn();
    vi.mocked(useTransactions).mockReturnValue({
      status: 'error',
      error: new AppError('offline', 'Network error'),
      retry: mockRetry,
    });

    renderPage();

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryBtn);
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('renders empty month state when there are no transactions in the month', () => {
    vi.mocked(useTransactions).mockReturnValue({
      status: 'success',
      data: [],
      retry: vi.fn(),
    });

    renderPage();

    expect(
      screen.getByText('No transactions for this month'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Start tracking by adding your first expense or income.',
      ),
    ).toBeInTheDocument();
  });

  it('renders empty filtered state when transactions exist but filters match none, and resets on click', () => {
    vi.mocked(useTransactions).mockReturnValue({
      status: 'success',
      data: mockTransactions,
      retry: vi.fn(),
    });

    renderPage('/app/transactions?search=UnknownQuery');

    expect(screen.getByText('No matching transactions')).toBeInTheDocument();

    const resetBtn = screen.getByTestId('filter-reset-button');
    expect(resetBtn).toBeInTheDocument();

    fireEvent.click(resetBtn);

    // After resetting search filter, both transactions should be displayed
    expect(screen.getByText('Supermarket dinner')).toBeInTheDocument();
    expect(screen.getByText('Consulting bonus')).toBeInTheDocument();
  });

  it('renders transaction items and monthly summary bar with totals', () => {
    vi.mocked(useTransactions).mockReturnValue({
      status: 'success',
      data: mockTransactions,
      retry: vi.fn(),
    });

    renderPage();

    expect(screen.getByTestId('transactions-page')).toBeInTheDocument();
    expect(screen.getByTestId('transaction-summary-bar')).toBeInTheDocument();

    // Check transactions rendered
    expect(screen.getByText('Supermarket dinner')).toBeInTheDocument();
    expect(screen.getByText('Consulting bonus')).toBeInTheDocument();
  });

  it('opens create transaction dialog via header button and creates a transaction', async () => {
    const user = userEvent.setup();
    vi.mocked(useTransactions).mockReturnValue({
      status: 'success',
      data: mockTransactions,
      retry: vi.fn(),
    });
    mockCreate.mockResolvedValueOnce('new-tx-id');

    renderPage();

    const addBtn = screen.getByTestId('add-transaction-button');
    await user.click(addBtn);

    expect(screen.getByText('New transaction')).toBeInTheDocument();

    // Fill amount (minor units are parsed from user input "45.50" -> 4550)
    const amountInput = screen.getByTestId('transaction-amount-input');
    await user.type(amountInput, '45.50');

    // Select category
    const categorySelect = screen.getByTestId('transaction-category-select');
    await user.click(categorySelect);

    const categoryOption = screen.getByTestId('category-option-cat-food');
    await user.click(categoryOption);

    // Fill note
    const noteInput = screen.getByTestId('transaction-note-input');
    await user.type(noteInput, 'Office lunch');

    // Submit form
    const submitBtn = screen.getByTestId('transaction-submit-button');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'expense',
          amount: 4550,
          categoryId: 'cat-food',
          accountId: 'acc-main',
          note: 'Office lunch',
        }),
      );
    });
  });

  it('opens create transaction dialog via mobile FAB button', async () => {
    const user = userEvent.setup();
    vi.mocked(useTransactions).mockReturnValue({
      status: 'success',
      data: [],
      retry: vi.fn(),
    });

    renderPage();

    const mobileFab = screen.getByTestId('mobile-add-fab');
    await user.click(mobileFab);

    expect(screen.getByText('New transaction')).toBeInTheDocument();
  });

  it('opens edit transaction dialog when clicking edit action and submits update', async () => {
    const user = userEvent.setup();
    vi.mocked(useTransactions).mockReturnValue({
      status: 'success',
      data: mockTransactions,
      retry: vi.fn(),
    });
    mockUpdate.mockResolvedValueOnce(undefined);

    renderPage();

    const actionsTrigger = screen.getByTestId('transaction-actions-tx-1');
    await user.click(actionsTrigger);

    const editMenuItem = screen.getByTestId('transaction-edit-tx-1');
    await user.click(editMenuItem);

    expect(screen.getByText('Edit transaction')).toBeInTheDocument();

    // Modify note
    const noteInput = screen.getByTestId('transaction-note-input');
    await user.clear(noteInput);
    await user.type(noteInput, 'Updated dinner note');

    // Submit form
    const submitBtn = screen.getByTestId('transaction-submit-button');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        'tx-1',
        mockTransactions[0],
        expect.objectContaining({
          note: 'Updated dinner note',
        }),
      );
    });
  });

  it('calls delete mutation when clicking delete action', async () => {
    const user = userEvent.setup();
    vi.mocked(useTransactions).mockReturnValue({
      status: 'success',
      data: mockTransactions,
      retry: vi.fn(),
    });
    mockRemove.mockResolvedValueOnce(undefined);

    renderPage();

    const actionsTrigger = screen.getByTestId('transaction-actions-tx-1');
    await user.click(actionsTrigger);

    const deleteMenuItem = screen.getByTestId('transaction-delete-tx-1');
    await user.click(deleteMenuItem);

    expect(mockRemove).toHaveBeenCalledWith(mockTransactions[0]);
  });
});
