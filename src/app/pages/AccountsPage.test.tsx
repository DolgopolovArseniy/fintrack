import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useAccounts,
  useAccountMutations,
  type Account,
} from '@/features/accounts';
import { useAuth } from '@/features/auth';
import { AppError } from '@/lib/errors';
import { AccountsPage } from './AccountsPage';

vi.mock('@/features/accounts', async () => {
  const actual = await vi.importActual('@/features/accounts');
  return {
    ...actual,
    useAccounts: vi.fn(),
    useAccountMutations: vi.fn(),
  };
});

vi.mock('@/features/auth', () => ({
  useAuth: vi.fn(),
}));

const mockAccounts: Account[] = [
  {
    id: 'acc-1',
    name: 'Main Card',
    type: 'card',
    balance: 50000,
    initialBalance: 50000,
    archived: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: 'acc-2',
    name: 'Cash Pocket',
    type: 'cash',
    balance: 20000,
    initialBalance: 10000,
    archived: false,
    createdAt: new Date('2026-01-02'),
    updatedAt: new Date('2026-01-02'),
  },
  {
    id: 'acc-3',
    name: 'Old Deposit',
    type: 'bank',
    balance: 100000,
    initialBalance: 100000,
    archived: true,
    createdAt: new Date('2026-01-03'),
    updatedAt: new Date('2026-01-03'),
  },
];

describe('AccountsPage', () => {
  const mockCreateAccount = vi.fn();
  const mockUpdateAccount = vi.fn();
  const mockArchiveAccount = vi.fn();
  const mockUnarchiveAccount = vi.fn();
  const mockRecalculateBalance = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('min-width: 768px'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-123' },
      profile: { baseCurrency: 'USD', locale: 'en' },
    } as unknown as ReturnType<typeof useAuth>);

    vi.mocked(useAccountMutations).mockReturnValue({
      createAccount: mockCreateAccount,
      updateAccount: mockUpdateAccount,
      archiveAccount: mockArchiveAccount,
      unarchiveAccount: mockUnarchiveAccount,
      recalculateBalance: mockRecalculateBalance,
      isSubmitting: false,
      isRecalculating: false,
    });
  });

  it('renders loading skeleton when accounts subscription is loading', () => {
    vi.mocked(useAccounts).mockReturnValue({
      status: 'loading',
      retry: vi.fn(),
    });

    render(<AccountsPage />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders error state with retry when accounts subscription fails', () => {
    const mockRetry = vi.fn();
    vi.mocked(useAccounts).mockReturnValue({
      status: 'error',
      error: new AppError('offline', 'Network error'),
      retry: mockRetry,
    });

    render(<AccountsPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders empty state when there are no accounts', () => {
    vi.mocked(useAccounts).mockReturnValue({
      status: 'success',
      data: [],
      retry: vi.fn(),
    });

    render(<AccountsPage />);

    expect(screen.getByText('No active accounts')).toBeInTheDocument();
  });

  it('renders accounts list and summary KPI on success', () => {
    vi.mocked(useAccounts).mockReturnValue({
      status: 'success',
      data: mockAccounts,
      retry: vi.fn(),
    });

    render(<AccountsPage />);

    expect(screen.getByTestId('accounts-page')).toBeInTheDocument();
    expect(screen.getByTestId('account-summary-header')).toBeInTheDocument();

    // Active accounts are rendered
    expect(screen.getByText('Main Card')).toBeInTheDocument();
    expect(screen.getByText('Cash Pocket')).toBeInTheDocument();

    // Archived account is hidden by default
    expect(screen.queryByText('Old Deposit')).not.toBeInTheDocument();
  });

  it('shows archived accounts when showArchived switch is toggled', () => {
    vi.mocked(useAccounts).mockReturnValue({
      status: 'success',
      data: mockAccounts,
      retry: vi.fn(),
    });

    render(<AccountsPage />);

    expect(screen.queryByText('Old Deposit')).not.toBeInTheDocument();

    const switchToggle = screen.getByTestId('show-archived-switch');
    fireEvent.click(switchToggle);

    expect(screen.getByText('Old Deposit')).toBeInTheDocument();
  });

  it('opens create account dialog and submits new account', async () => {
    vi.mocked(useAccounts).mockReturnValue({
      status: 'success',
      data: mockAccounts,
      retry: vi.fn(),
    });
    mockCreateAccount.mockResolvedValueOnce('new-acc-id');

    render(<AccountsPage />);

    const addBtn = screen.getByTestId('add-account-button');
    fireEvent.click(addBtn);

    expect(screen.getByText('Create account')).toBeInTheDocument();

    const nameInput = screen.getByTestId('account-name-input');
    fireEvent.change(nameInput, { target: { value: 'Salary Account' } });

    const bankBtn = screen.getByTestId('account-type-bank');
    fireEvent.click(bankBtn);

    const saveBtn = screen.getByTestId('account-form-submit');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockCreateAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Salary Account',
          type: 'bank',
        }),
      );
    });
  });

  it('opens edit account dialog and updates account', async () => {
    const user = userEvent.setup();
    vi.mocked(useAccounts).mockReturnValue({
      status: 'success',
      data: mockAccounts,
      retry: vi.fn(),
    });
    mockUpdateAccount.mockResolvedValueOnce(undefined);

    render(<AccountsPage />);

    // Open actions menu for acc-1
    const actionBtn = screen.getByTestId('account-actions-acc-1');
    await user.click(actionBtn);

    const editBtn = screen.getByTestId('account-edit-acc-1');
    await user.click(editBtn);

    expect(screen.getByText('Edit account')).toBeInTheDocument();

    const nameInput = screen.getByTestId('account-name-input');
    fireEvent.change(nameInput, { target: { value: 'Black Premium Card' } });

    const saveBtn = screen.getByTestId('account-form-submit');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateAccount).toHaveBeenCalledWith(
        'acc-1',
        mockAccounts[0],
        expect.objectContaining({
          name: 'Black Premium Card',
        }),
      );
    });
  });

  it('opens archive confirm dialog and archives account', async () => {
    const user = userEvent.setup();
    vi.mocked(useAccounts).mockReturnValue({
      status: 'success',
      data: mockAccounts,
      retry: vi.fn(),
    });
    mockArchiveAccount.mockResolvedValueOnce(undefined);

    render(<AccountsPage />);

    // Open actions menu for acc-1
    const actionBtn = screen.getByTestId('account-actions-acc-1');
    await user.click(actionBtn);

    const archiveItem = screen.getByTestId('account-archive-acc-1');
    await user.click(archiveItem);

    expect(screen.getByText('Archive account')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /archive/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockArchiveAccount).toHaveBeenCalledWith('acc-1');
    });
  });

  it('unarchives an account when unarchive action is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useAccounts).mockReturnValue({
      status: 'success',
      data: mockAccounts,
      retry: vi.fn(),
    });
    mockUnarchiveAccount.mockResolvedValueOnce(undefined);

    render(<AccountsPage />);

    // Show archived accounts
    const switchToggle = screen.getByTestId('show-archived-switch');
    fireEvent.click(switchToggle);

    // Open actions for acc-3 (archived)
    const actionBtn = screen.getByTestId('account-actions-acc-3');
    await user.click(actionBtn);

    const unarchiveItem = screen.getByTestId('account-unarchive-acc-3');
    await user.click(unarchiveItem);

    await waitFor(() => {
      expect(mockUnarchiveAccount).toHaveBeenCalledWith('acc-3');
    });
  });

  it('calls recalculateBalance when recalculate action is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useAccounts).mockReturnValue({
      status: 'success',
      data: mockAccounts,
      retry: vi.fn(),
    });
    mockRecalculateBalance.mockResolvedValueOnce({
      previousBalance: 50000,
      newBalance: 50000,
      delta: 0,
      transactionCount: 2,
    });

    render(<AccountsPage />);

    const actionBtn = screen.getByTestId('account-actions-acc-1');
    await user.click(actionBtn);

    const recalcItem = screen.getByTestId('account-recalculate-acc-1');
    await user.click(recalcItem);

    await waitFor(() => {
      expect(mockRecalculateBalance).toHaveBeenCalledWith('acc-1');
    });
  });
});
