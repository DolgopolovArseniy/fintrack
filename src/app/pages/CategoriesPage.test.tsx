import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useCategories,
  useCategoryMutations,
  type Category,
} from '@/features/categories';
import { AppError } from '@/lib/errors';
import { CategoriesPage } from './CategoriesPage';

vi.mock('@/features/categories', async () => {
  const actual = await vi.importActual('@/features/categories');
  return {
    ...actual,
    useCategories: vi.fn(),
    useCategoryMutations: vi.fn(),
  };
});

const mockCategories: Category[] = [
  {
    id: 'cat-1',
    type: 'expense',
    name: 'Groceries',
    icon: 'shopping-cart',
    color: 'emerald',
    archived: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: 'cat-2',
    type: 'expense',
    name: 'Old Subscription',
    icon: 'tag',
    color: 'slate',
    archived: true,
    createdAt: new Date('2026-01-02'),
    updatedAt: new Date('2026-01-02'),
  },
  {
    id: 'cat-3',
    type: 'income',
    name: 'Salary',
    icon: 'wallet',
    color: 'sky',
    archived: false,
    createdAt: new Date('2026-01-03'),
    updatedAt: new Date('2026-01-03'),
  },
  {
    id: 'cat-4',
    type: 'income',
    name: 'Old Freelance',
    icon: 'briefcase',
    color: 'amber',
    archived: true,
    createdAt: new Date('2026-01-04'),
    updatedAt: new Date('2026-01-04'),
  },
];

describe('CategoriesPage', () => {
  const mockCreateCategory = vi.fn();
  const mockUpdateCategory = vi.fn();
  const mockArchiveCategory = vi.fn();
  const mockUnarchiveCategory = vi.fn();

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

    vi.mocked(useCategoryMutations).mockReturnValue({
      createCategory: mockCreateCategory,
      updateCategory: mockUpdateCategory,
      archiveCategory: mockArchiveCategory,
      unarchiveCategory: mockUnarchiveCategory,
      isSubmitting: false,
    });
  });

  it('renders loading state when categories are loading', () => {
    vi.mocked(useCategories).mockReturnValue({
      status: 'loading',
      retry: vi.fn(),
    });

    render(<CategoriesPage />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders error state with retry when category subscription fails', () => {
    const mockRetry = vi.fn();
    vi.mocked(useCategories).mockReturnValue({
      status: 'error',
      error: new AppError('offline', 'Network error'),
      retry: mockRetry,
    });

    render(<CategoriesPage />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders empty state when there are no categories', () => {
    vi.mocked(useCategories).mockReturnValue({
      status: 'success',
      data: [],
      retry: vi.fn(),
    });

    render(<CategoriesPage />);

    expect(screen.getByText('No expense categories')).toBeInTheDocument();
  });

  it('renders active categories count in tabs and expense categories by default', () => {
    vi.mocked(useCategories).mockReturnValue({
      status: 'success',
      data: mockCategories,
      retry: vi.fn(),
    });

    render(<CategoriesPage />);

    expect(screen.getByTestId('categories-page')).toBeInTheDocument();

    // Check active tab triggers have counts (1 active expense, 1 active income)
    const expenseTab = screen.getByTestId('expense-tab');
    const incomeTab = screen.getByTestId('income-tab');
    expect(expenseTab).toHaveTextContent('Expenses');
    expect(expenseTab).toHaveTextContent('1');
    expect(incomeTab).toHaveTextContent('Income');
    expect(incomeTab).toHaveTextContent('1');

    // By default, active expense is visible, archived expense is hidden
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.queryByText('Old Subscription')).not.toBeInTheDocument();
    expect(screen.queryByText('Salary')).not.toBeInTheDocument();
  });

  it('switches between expenses and incomes tabs', async () => {
    const user = userEvent.setup();
    vi.mocked(useCategories).mockReturnValue({
      status: 'success',
      data: mockCategories,
      retry: vi.fn(),
    });

    render(<CategoriesPage />);

    const incomeTab = screen.getByTestId('income-tab');
    await user.click(incomeTab);

    // Income category is now visible, expense is hidden
    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.queryByText('Groceries')).not.toBeInTheDocument();
  });

  it('shows archived categories when showArchived switch is toggled', () => {
    vi.mocked(useCategories).mockReturnValue({
      status: 'success',
      data: mockCategories,
      retry: vi.fn(),
    });

    render(<CategoriesPage />);

    expect(screen.queryByText('Old Subscription')).not.toBeInTheDocument();

    const switchToggle = screen.getByTestId('show-archived-switch');
    fireEvent.click(switchToggle);

    expect(screen.getByText('Old Subscription')).toBeInTheDocument();
  });

  it('opens create category dialog and submits new category', async () => {
    vi.mocked(useCategories).mockReturnValue({
      status: 'success',
      data: mockCategories,
      retry: vi.fn(),
    });
    mockCreateCategory.mockResolvedValueOnce('new-cat-id');

    render(<CategoriesPage />);

    const addBtn = screen.getByTestId('add-category-button');
    fireEvent.click(addBtn);

    expect(screen.getByText('New Category')).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'Transportation' } });

    const saveBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockCreateCategory).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Transportation',
          type: 'expense',
        }),
      );
    });
  });

  it('opens edit category dialog and updates category', async () => {
    const user = userEvent.setup();
    vi.mocked(useCategories).mockReturnValue({
      status: 'success',
      data: mockCategories,
      retry: vi.fn(),
    });
    mockUpdateCategory.mockResolvedValueOnce(undefined);

    render(<CategoriesPage />);

    // Open dropdown menu for cat-1
    const actionBtn = screen.getByTestId('category-actions-cat-1');
    await user.click(actionBtn);

    const editBtn = screen.getByRole('menuitem', { name: /edit/i });
    await user.click(editBtn);

    expect(screen.getByText('Edit Category')).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'Supermarkets' } });

    const saveBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateCategory).toHaveBeenCalledWith(
        'cat-1',
        expect.objectContaining({
          name: 'Supermarkets',
        }),
      );
    });
  });

  it('opens confirm archive dialog and archives category on confirm', async () => {
    const user = userEvent.setup();
    vi.mocked(useCategories).mockReturnValue({
      status: 'success',
      data: mockCategories,
      retry: vi.fn(),
    });
    mockArchiveCategory.mockResolvedValueOnce(undefined);

    render(<CategoriesPage />);

    // Open dropdown menu for cat-1
    const actionBtn = screen.getByTestId('category-actions-cat-1');
    await user.click(actionBtn);

    const archiveBtn = screen.getByRole('menuitem', { name: /archive/i });
    await user.click(archiveBtn);

    expect(screen.getByText('Archive category')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /archive/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockArchiveCategory).toHaveBeenCalledWith('cat-1');
    });
  });

  it('unarchives an archived category when unarchive is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useCategories).mockReturnValue({
      status: 'success',
      data: mockCategories,
      retry: vi.fn(),
    });
    mockUnarchiveCategory.mockResolvedValueOnce(undefined);

    render(<CategoriesPage />);

    // Show archived
    const switchToggle = screen.getByTestId('show-archived-switch');
    fireEvent.click(switchToggle);

    // Open actions for cat-2 (which is archived)
    const actionBtn = screen.getByTestId('category-actions-cat-2');
    await user.click(actionBtn);

    const unarchiveBtn = screen.getByRole('menuitem', { name: /restore/i });
    await user.click(unarchiveBtn);

    await waitFor(() => {
      expect(mockUnarchiveCategory).toHaveBeenCalledWith('cat-2');
    });
  });

  it('provides accessible labels and tablist roles for page controls', () => {
    vi.mocked(useCategories).mockReturnValue({
      status: 'success',
      data: mockCategories,
      retry: vi.fn(),
    });

    render(<CategoriesPage />);

    // Tabs role
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /expenses/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /income/i })).toBeInTheDocument();

    // Switch accessibility
    const switchControl = screen.getByRole('switch', {
      name: /show archived/i,
    });
    expect(switchControl).toBeInTheDocument();
    expect(switchControl).toHaveAttribute('id', 'show-archived');

    // Add button
    expect(
      screen.getByRole('button', { name: /add category/i }),
    ).toBeInTheDocument();
  });
});
