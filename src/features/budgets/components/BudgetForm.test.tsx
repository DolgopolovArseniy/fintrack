import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Category } from '@/features/categories';
import type { Budget } from '../schemas';
import { BudgetForm } from './BudgetForm';

// Mock pointer events for Radix UI in jsdom
beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
});

describe('BudgetForm', () => {
  const mockCategories: Category[] = [
    {
      id: 'cat-food',
      type: 'expense',
      name: 'Food',
      icon: 'utensils',
      color: 'orange',
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'cat-travel',
      type: 'expense',
      name: 'Travel',
      icon: 'plane',
      color: 'sky',
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const existingBudget: Budget = {
    id: '2026-10_cat-food',
    categoryId: 'cat-food',
    month: '2026-10',
    limit: 500000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('renders create mode and allows creating a new budget', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    const handleOpenChange = vi.fn();

    render(
      <BudgetForm
        open={true}
        onOpenChange={handleOpenChange}
        month="2026-10"
        categories={mockCategories}
        onSubmit={handleSubmit}
        isDesktop={true}
      />,
    );

    expect(screen.getByText('Set category budget')).toBeInTheDocument();

    const amountInput = screen.getByTestId('budget-limit-input');
    fireEvent.change(amountInput, { target: { value: '15000' } });

    const saveButton = screen.getByTestId('budget-form-submit');
    await user.click(saveButton);

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryId: 'cat-food',
        month: '2026-10',
        limit: 1500000,
      }),
    );
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders edit mode with fixed category and allows updating limit', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    const handleOpenChange = vi.fn();

    render(
      <BudgetForm
        open={true}
        onOpenChange={handleOpenChange}
        month="2026-10"
        initialData={existingBudget}
        categories={mockCategories}
        onSubmit={handleSubmit}
        isDesktop={true}
      />,
    );

    expect(screen.getByText('Edit budget limit')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();

    const amountInput = screen.getByTestId('budget-limit-input');
    fireEvent.change(amountInput, { target: { value: '25000' } });

    const saveButton = screen.getByTestId('budget-form-submit');
    await user.click(saveButton);

    expect(handleSubmit).toHaveBeenCalledWith({
      limit: 2500000,
    });
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});
