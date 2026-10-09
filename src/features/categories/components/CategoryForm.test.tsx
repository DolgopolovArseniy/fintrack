import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Category } from '../schemas';
import { CategoryForm } from './CategoryForm';

describe('CategoryForm', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('min-width: 768px'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  const existingCategories: Category[] = [
    {
      id: 'cat-1',
      type: 'expense',
      name: 'Cafe',
      icon: 'coffee',
      color: 'amber',
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'cat-2',
      type: 'income',
      name: 'Salary',
      icon: 'wallet',
      color: 'emerald',
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  it('submits valid category data when creating a new category', async () => {
    const handleSubmit = vi.fn();

    render(
      <CategoryForm
        defaultType="expense"
        onSubmit={handleSubmit}
        existingCategories={existingCategories}
      />,
    );

    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'Books & Supplies' } });

    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'expense',
          name: 'Books & Supplies',
          icon: 'utensils',
          color: 'orange',
          archived: false,
        }),
      );
    });
  });

  it('blocks submit and shows duplicate error for duplicate name within same type (case-insensitive)', async () => {
    const handleSubmit = vi.fn();

    render(
      <CategoryForm
        defaultType="expense"
        onSubmit={handleSubmit}
        existingCategories={existingCategories}
      />,
    );

    const nameInput = screen.getByLabelText(/name/i);
    // 'Cafe' exists in expense categories
    fireEvent.change(nameInput, { target: { value: 'cafe' } });

    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('category-name-error')).toHaveTextContent(
        'A category with this name already exists',
      );
    });

    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('allows same name in different type (e.g. salary as expense)', async () => {
    const handleSubmit = vi.fn();

    render(
      <CategoryForm
        defaultType="expense"
        onSubmit={handleSubmit}
        existingCategories={existingCategories}
      />,
    );

    const nameInput = screen.getByLabelText(/name/i);
    // 'Salary' exists as income, but creating as expense is allowed
    fireEvent.change(nameInput, { target: { value: 'Salary' } });

    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'expense',
          name: 'Salary',
        }),
      );
    });
  });

  it('locks type toggle and shows locked message in edit mode', () => {
    const categoryToEdit: Category = {
      id: 'cat-1',
      type: 'expense',
      name: 'Cafe',
      icon: 'coffee',
      color: 'amber',
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <CategoryForm
        initialData={categoryToEdit}
        onSubmit={vi.fn()}
        existingCategories={existingCategories}
      />,
    );

    const expenseBtn = screen.getByRole('button', { name: /expenses/i });
    const incomeBtn = screen.getByRole('button', { name: /income/i });

    expect(expenseBtn).toBeDisabled();
    expect(incomeBtn).toBeDisabled();
    expect(
      screen.getByText('Category type cannot be changed after creation'),
    ).toBeInTheDocument();
  });

  it('submits updated fields when editing existing category', async () => {
    const handleSubmit = vi.fn();
    const categoryToEdit: Category = {
      id: 'cat-1',
      type: 'expense',
      name: 'Cafe',
      icon: 'coffee',
      color: 'amber',
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <CategoryForm
        initialData={categoryToEdit}
        onSubmit={handleSubmit}
        existingCategories={existingCategories}
      />,
    );

    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'Coffee & Snacks' } });

    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'expense',
          name: 'Coffee & Snacks',
          icon: 'coffee',
          color: 'amber',
        }),
      );
    });
  });

  it('shows validation error when name is empty for new category', async () => {
    const handleSubmit = vi.fn();

    render(
      <CategoryForm
        defaultType="expense"
        onSubmit={handleSubmit}
        existingCategories={existingCategories}
      />,
    );

    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('category-name-error')).toBeInTheDocument();
    });

    expect(handleSubmit).not.toHaveBeenCalled();
  });
});
