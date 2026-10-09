import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Category } from '@/features/categories';
import { UnbudgetedCategoriesSection } from './UnbudgetedCategoriesSection';

describe('UnbudgetedCategoriesSection', () => {
  const mockCategories: Category[] = [
    {
      id: 'cat-books',
      type: 'expense',
      name: 'Books',
      icon: 'book',
      color: 'indigo',
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  it('renders unbudgeted categories chips with action buttons', async () => {
    const user = userEvent.setup();
    const handleSetLimit = vi.fn();

    render(
      <UnbudgetedCategoriesSection
        categories={mockCategories}
        onSetLimit={handleSetLimit}
      />,
    );

    expect(screen.getByText('Categories without budget')).toBeInTheDocument();
    expect(screen.getByText('Books')).toBeInTheDocument();

    const setLimitBtn = screen.getByRole('button', { name: /set limit/i });
    await user.click(setLimitBtn);

    expect(handleSetLimit).toHaveBeenCalledWith(mockCategories[0]);
  });

  it('returns null when categories array is empty', () => {
    const { container } = render(
      <UnbudgetedCategoriesSection categories={[]} onSetLimit={vi.fn()} />,
    );

    expect(container.firstChild).toBeNull();
  });
});
