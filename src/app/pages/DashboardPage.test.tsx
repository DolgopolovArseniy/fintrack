import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccounts, type Account } from '@/features/accounts';
import { useAuth } from '@/features/auth';
import { useCategories, type Category } from '@/features/categories';
import { useDashboardData, type DashboardData } from '@/features/dashboard';
import {
  useTransactionMutations,
  type Transaction,
} from '@/features/transactions';
import { AppError } from '@/lib/errors';
import { DashboardPage } from './DashboardPage';

// Mock Recharts / ResizeObserver
window.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('@/features/dashboard', async () => {
  const actual = await vi.importActual('@/features/dashboard');
  return {
    ...actual,
    useDashboardData: vi.fn(),
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

vi.mock('@/features/transactions', async () => {
  const actual = await vi.importActual('@/features/transactions');
  return {
    ...actual,
    useTransactionMutations: vi.fn(),
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

const mockDashboardData: DashboardData = {
  metrics: {
    totalBalance: 50000,
    currentIncome: 10000,
    currentExpense: 2500,
    netSavings: 7500,
    savingsRate: 75,
    incomeChange: {
      percent: 10,
      direction: 'increase',
      isNewPeriod: false,
    },
    expenseChange: {
      percent: 5,
      direction: 'decrease',
      isNewPeriod: false,
    },
  },
  categoryExpenses: [
    {
      categoryId: 'cat-food',
      total: 2500,
      percentage: 100,
    },
  ],
  monthlyHistory: [
    { month: '2026-05', label: 'May', income: 0, expense: 0 },
    { month: '2026-06', label: 'Jun', income: 0, expense: 0 },
    { month: '2026-07', label: 'Jul', income: 0, expense: 0 },
    { month: '2026-08', label: 'Aug', income: 0, expense: 0 },
    { month: '2026-09', label: 'Sep', income: 8000, expense: 3000 },
    { month: '2026-10', label: 'Oct', income: 10000, expense: 2500 },
  ],
  recentTransactions: mockTransactions,
};

describe('DashboardPage', () => {
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

  const renderPage = (initialUrl = '/app/dashboard') => {
    return render(
      <MemoryRouter initialEntries={[initialUrl]}>
        <Routes>
          <Route path="/app/dashboard" element={<DashboardPage />} />
        </Routes>
      </MemoryRouter>,
    );
  };

  it('renders loading skeleton when dashboard data is loading', () => {
    vi.mocked(useDashboardData).mockReturnValue({
      status: 'loading',
      retry: vi.fn(),
    });

    renderPage();

    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('renders error state with retry button when subscription fails', () => {
    const mockRetry = vi.fn();
    vi.mocked(useDashboardData).mockReturnValue({
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

  it('renders dashboard with KPI cards, charts, and recent transactions', () => {
    vi.mocked(useDashboardData).mockReturnValue({
      status: 'success',
      data: mockDashboardData,
      retry: vi.fn(),
    });

    renderPage();

    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-kpi-grid')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-charts')).toBeInTheDocument();
    expect(screen.getByTestId('recent-transactions-card')).toBeInTheDocument();

    // Check KPI values
    expect(screen.getByTestId('kpi-total-balance')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-income')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-expense')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-net-savings')).toBeInTheDocument();

    // Check recent transactions rendered
    expect(screen.getByText('Supermarket dinner')).toBeInTheDocument();
    expect(screen.getByText('Consulting bonus')).toBeInTheDocument();
  });

  it('opens quick add transaction dialog and creates a new transaction', async () => {
    const user = userEvent.setup();
    vi.mocked(useDashboardData).mockReturnValue({
      status: 'success',
      data: mockDashboardData,
      retry: vi.fn(),
    });
    mockCreate.mockResolvedValueOnce('new-tx-id');

    renderPage();

    const addBtn = screen.getByTestId('add-transaction-button');
    await user.click(addBtn);

    expect(screen.getByRole('dialog')).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'New transaction' }),
    ).toBeInTheDocument();

    // Fill amount (45.50 -> 4550)
    const amountInput = screen.getByTestId('transaction-amount-input');
    await user.type(amountInput, '45.50');

    // Select category
    const categorySelect = screen.getByTestId('transaction-category-select');
    await user.click(categorySelect);

    const categoryOption = screen.getByTestId('category-option-cat-food');
    await user.click(categoryOption);

    // Fill note
    const noteInput = screen.getByTestId('transaction-note-input');
    await user.type(noteInput, 'Quick lunch');

    // Submit
    const submitBtn = screen.getByTestId('transaction-submit-button');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'expense',
          amount: 4550,
          categoryId: 'cat-food',
          accountId: 'acc-main',
          note: 'Quick lunch',
        }),
      );
    });
  });

  it('opens create dialog via mobile FAB button', async () => {
    const user = userEvent.setup();
    vi.mocked(useDashboardData).mockReturnValue({
      status: 'success',
      data: mockDashboardData,
      retry: vi.fn(),
    });

    renderPage();

    const mobileFab = screen.getByTestId('mobile-add-fab');
    await user.click(mobileFab);

    expect(screen.getByRole('dialog')).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'New transaction' }),
    ).toBeInTheDocument();
  });
});
