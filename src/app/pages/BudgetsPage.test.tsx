import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCategories, type Category } from '@/features/categories';
import {
  useBudgetMutations,
  useBudgetSummary,
  type BudgetSummaryTotals,
  type EnrichedBudget,
} from '@/features/budgets';
import { AppError } from '@/lib/errors';
import { BudgetsPage } from './BudgetsPage';

vi.mock('@/features/budgets', async () => {
  const actual = await vi.importActual('@/features/budgets');
  return {
    ...actual,
    useBudgetSummary: vi.fn(),
    useBudgetMutations: vi.fn(),
  };
});

vi.mock('@/features/categories', async () => {
  const actual = await vi.importActual('@/features/categories');
  return {
    ...actual,
    useCategories: vi.fn(),
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
    id: 'cat-transport',
    type: 'expense',
    name: 'Transport',
    icon: 'car',
    color: 'sky',
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

const mockEnrichedBudgets: EnrichedBudget[] = [
  {
    id: '2026-10_cat-food',
    categoryId: 'cat-food',
    month: '2026-10',
    limit: 20000,
    spent: 15000,
    remaining: 5000,
    overspent: 0,
    progress: 75,
    status: 'normal',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  },
  {
    id: '2026-10_cat-transport',
    categoryId: 'cat-transport',
    month: '2026-10',
    limit: 10000,
    spent: 12000,
    remaining: 0,
    overspent: 2000,
    progress: 120,
    status: 'exceeded',
    createdAt: new Date('2026-10-01'),
    updatedAt: new Date('2026-10-01'),
  },
];

const mockSummaryTotals: BudgetSummaryTotals = {
  totalLimit: 30000,
  totalSpent: 27000,
  totalRemaining: 5000,
  totalOverspent: 2000,
  overallProgress: 90,
  overallStatus: 'warning',
  budgetCount: 2,
  normalCount: 1,
  warningCount: 0,
  exceededCount: 1,
};

describe('BudgetsPage', () => {
  const mockCreateBudget = vi.fn();
  const mockUpdateBudget = vi.fn();
  const mockDeleteBudget = vi.fn();
  const mockCopyBudgets = vi.fn();

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

    vi.mocked(useCategories).mockReturnValue({
      status: 'success',
      data: mockCategories,
      retry: vi.fn(),
    });

    vi.mocked(useBudgetMutations).mockReturnValue({
      createBudget: mockCreateBudget,
      updateBudget: mockUpdateBudget,
      deleteBudget: mockDeleteBudget,
      copyBudgets: mockCopyBudgets,
      isSubmitting: false,
      isCopying: false,
    });
  });

  const renderPage = (initialUrl = '/app/budgets') => {
    return render(
      <MemoryRouter initialEntries={[initialUrl]}>
        <Routes>
          <Route path="/app/budgets" element={<BudgetsPage />} />
          <Route
            path="/app/transactions"
            element={
              <div data-testid="mock-transactions-page">Transactions</div>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
  };

  it('renders loading skeleton when data is loading', () => {
    vi.mocked(useBudgetSummary).mockReturnValue({
      enrichedBudgets: [],
      summaryTotals: mockSummaryTotals,
      unbudgetedCategories: [],
      previousMonthBudgetsCount: 0,
      isLoading: true,
      error: null,
    });

    renderPage();

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders error state with retry when query fails', () => {
    vi.mocked(useBudgetSummary).mockReturnValue({
      enrichedBudgets: [],
      summaryTotals: mockSummaryTotals,
      unbudgetedCategories: [],
      previousMonthBudgetsCount: 0,
      isLoading: false,
      error: new AppError('offline', 'Network error'),
    });

    renderPage();

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders empty month state when there are no budgets and 0 previous month budgets', () => {
    vi.mocked(useBudgetSummary).mockReturnValue({
      enrichedBudgets: [],
      summaryTotals: {
        totalLimit: 0,
        totalSpent: 0,
        totalRemaining: 0,
        totalOverspent: 0,
        overallProgress: 0,
        overallStatus: 'normal',
        budgetCount: 0,
        normalCount: 0,
        warningCount: 0,
        exceededCount: 0,
      },
      unbudgetedCategories: [mockCategories[0]!],
      previousMonthBudgetsCount: 0,
      isLoading: false,
      error: null,
    });

    renderPage();

    expect(screen.getByText('No budgets for this month')).toBeInTheDocument();
    expect(screen.getByTestId('empty-add-budget-button')).toBeInTheDocument();
    expect(
      screen.getByTestId('unbudgeted-categories-section'),
    ).toBeInTheDocument();
  });

  it('renders fast copy banner when no budgets exist in current month but previous month has budgets', async () => {
    const user = userEvent.setup();
    vi.mocked(useBudgetSummary).mockReturnValue({
      enrichedBudgets: [],
      summaryTotals: {
        totalLimit: 0,
        totalSpent: 0,
        totalRemaining: 0,
        totalOverspent: 0,
        overallProgress: 0,
        overallStatus: 'normal',
        budgetCount: 0,
        normalCount: 0,
        warningCount: 0,
        exceededCount: 0,
      },
      unbudgetedCategories: [],
      previousMonthBudgetsCount: 3,
      isLoading: false,
      error: null,
    });

    renderPage();

    expect(screen.getByTestId('copy-budgets-banner')).toBeInTheDocument();
    const copyBannerAction = screen.getByTestId('copy-banner-action');
    await user.click(copyBannerAction);

    expect(screen.getByTestId('copy-budgets-dialog')).toBeInTheDocument();
  });

  it('renders active budgets list and summary header', () => {
    vi.mocked(useBudgetSummary).mockReturnValue({
      enrichedBudgets: mockEnrichedBudgets,
      summaryTotals: mockSummaryTotals,
      unbudgetedCategories: [],
      previousMonthBudgetsCount: 2,
      isLoading: false,
      error: null,
    });

    renderPage();

    expect(screen.getByTestId('budgets-page')).toBeInTheDocument();
    expect(screen.getByTestId('budget-summary-header')).toBeInTheDocument();
    expect(screen.getByTestId('budget-list')).toBeInTheDocument();
    expect(screen.getAllByTestId('budget-card')).toHaveLength(2);
  });

  it('opens create budget dialog via header button and creates a budget', async () => {
    const user = userEvent.setup();
    vi.mocked(useBudgetSummary).mockReturnValue({
      enrichedBudgets: [],
      summaryTotals: mockSummaryTotals,
      unbudgetedCategories: mockCategories.filter((c) => c.type === 'expense'),
      previousMonthBudgetsCount: 0,
      isLoading: false,
      error: null,
    });
    mockCreateBudget.mockResolvedValueOnce(undefined);

    renderPage('/app/budgets?month=2026-10');

    const addBtn = screen.getByTestId('add-budget-button');
    await user.click(addBtn);

    expect(screen.getByTestId('budget-form-dialog')).toBeInTheDocument();

    const limitInput = screen.getByTestId('budget-limit-input');
    await user.type(limitInput, '500.00');

    const submitBtn = screen.getByTestId('budget-form-submit');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateBudget).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: 'cat-food',
          month: '2026-10',
          limit: 50000,
        }),
      );
    });
  });

  it('opens create budget dialog with preselected category when clicking Set Limit on unbudgeted section', async () => {
    const user = userEvent.setup();
    vi.mocked(useBudgetSummary).mockReturnValue({
      enrichedBudgets: [mockEnrichedBudgets[0]!],
      summaryTotals: mockSummaryTotals,
      unbudgetedCategories: [mockCategories[1]!], // cat-transport
      previousMonthBudgetsCount: 0,
      isLoading: false,
      error: null,
    });
    mockCreateBudget.mockResolvedValueOnce(undefined);

    renderPage('/app/budgets?month=2026-10');

    const unbudgetedSection = screen.getByTestId(
      'unbudgeted-categories-section',
    );
    expect(unbudgetedSection).toBeInTheDocument();

    const setLimitBtn = screen.getByRole('button', { name: /set limit/i });
    await user.click(setLimitBtn);

    expect(screen.getByTestId('budget-form-dialog')).toBeInTheDocument();

    const limitInput = screen.getByTestId('budget-limit-input');
    await user.type(limitInput, '150.00');

    const submitBtn = screen.getByTestId('budget-form-submit');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateBudget).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: 'cat-transport',
          month: '2026-10',
          limit: 15000,
        }),
      );
    });
  });

  it('opens edit budget dialog and submits update', async () => {
    const user = userEvent.setup();
    vi.mocked(useBudgetSummary).mockReturnValue({
      enrichedBudgets: mockEnrichedBudgets,
      summaryTotals: mockSummaryTotals,
      unbudgetedCategories: [],
      previousMonthBudgetsCount: 0,
      isLoading: false,
      error: null,
    });
    mockUpdateBudget.mockResolvedValueOnce(undefined);

    renderPage('/app/budgets?month=2026-10');

    const actionsTrigger = screen.getByTestId(
      `budget-actions-${mockEnrichedBudgets[0]!.id}`,
    );
    await user.click(actionsTrigger);

    const editMenuItem = screen.getByText('Edit limit');
    await user.click(editMenuItem);

    expect(screen.getByTestId('budget-form-dialog')).toBeInTheDocument();

    const limitInput = screen.getByTestId('budget-limit-input');
    await user.clear(limitInput);
    await user.type(limitInput, '350.00');

    const submitBtn = screen.getByTestId('budget-form-submit');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockUpdateBudget).toHaveBeenCalledWith('2026-10_cat-food', {
        limit: 35000,
      });
    });
  });

  it('opens delete confirmation dialog and deletes budget on confirm', async () => {
    const user = userEvent.setup();
    vi.mocked(useBudgetSummary).mockReturnValue({
      enrichedBudgets: mockEnrichedBudgets,
      summaryTotals: mockSummaryTotals,
      unbudgetedCategories: [],
      previousMonthBudgetsCount: 0,
      isLoading: false,
      error: null,
    });
    mockDeleteBudget.mockResolvedValueOnce(undefined);

    renderPage('/app/budgets?month=2026-10');

    const actionsTrigger = screen.getByTestId(
      `budget-actions-${mockEnrichedBudgets[0]!.id}`,
    );
    await user.click(actionsTrigger);

    const deleteMenuItem = screen.getByText('Delete budget');
    await user.click(deleteMenuItem);

    expect(screen.getByText('Delete budget')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /^delete$/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockDeleteBudget).toHaveBeenCalledWith('2026-10_cat-food');
    });
  });

  it('navigates to transactions page with filters when clicking view transactions', async () => {
    const user = userEvent.setup();
    vi.mocked(useBudgetSummary).mockReturnValue({
      enrichedBudgets: mockEnrichedBudgets,
      summaryTotals: mockSummaryTotals,
      unbudgetedCategories: [],
      previousMonthBudgetsCount: 0,
      isLoading: false,
      error: null,
    });

    renderPage('/app/budgets?month=2026-10');

    const actionsTrigger = screen.getByTestId(
      `budget-actions-${mockEnrichedBudgets[0]!.id}`,
    );
    await user.click(actionsTrigger);

    const viewTxMenuItem = screen.getByText('View transactions');
    await user.click(viewTxMenuItem);

    expect(screen.getByTestId('mock-transactions-page')).toBeInTheDocument();
  });

  it('opens copy dialog via header button and confirms copying', async () => {
    const user = userEvent.setup();
    vi.mocked(useBudgetSummary).mockReturnValue({
      enrichedBudgets: mockEnrichedBudgets,
      summaryTotals: mockSummaryTotals,
      unbudgetedCategories: [],
      previousMonthBudgetsCount: 2,
      isLoading: false,
      error: null,
    });
    mockCopyBudgets.mockResolvedValueOnce({ copied: 2, skipped: 0 });

    renderPage('/app/budgets?month=2026-10');

    const copyBtn = screen.getByTestId('copy-budgets-button');
    await user.click(copyBtn);

    expect(screen.getByTestId('copy-budgets-dialog')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /copy budgets/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockCopyBudgets).toHaveBeenCalledWith('2026-09', '2026-10', {
        overwrite: false,
      });
    });
  });

  it('opens create dialog via mobile FAB button', async () => {
    const user = userEvent.setup();
    vi.mocked(useBudgetSummary).mockReturnValue({
      enrichedBudgets: [],
      summaryTotals: mockSummaryTotals,
      unbudgetedCategories: [],
      previousMonthBudgetsCount: 0,
      isLoading: false,
      error: null,
    });

    renderPage();

    const mobileFab = screen.getByTestId('mobile-add-budget-fab');
    await user.click(mobileFab);

    expect(screen.getByTestId('budget-form-dialog')).toBeInTheDocument();
  });
});
