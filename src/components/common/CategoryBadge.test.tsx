import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CategoryBadge } from './CategoryBadge';

describe('CategoryBadge', () => {
  it('renders custom category name', () => {
    render(
      <CategoryBadge name="Books & Education" color="indigo" icon="book" />,
    );

    expect(screen.getByText('Books & Education')).toBeInTheDocument();
  });

  it('renders translated system category name when only systemKey is provided', () => {
    render(<CategoryBadge systemKey="food" color="orange" icon="utensils" />);

    expect(screen.getByText('Food & Groceries')).toBeInTheDocument();
  });

  it('prioritizes name over systemKey', () => {
    render(
      <CategoryBadge
        name="Groceries Only"
        systemKey="food"
        color="orange"
        icon="utensils"
      />,
    );

    expect(screen.getByText('Groceries Only')).toBeInTheDocument();
    expect(screen.queryByText('Food & Groceries')).not.toBeInTheDocument();
  });

  it('renders Lucide icon correctly', () => {
    const { container } = render(
      <CategoryBadge name="Transport" color="sky" icon="car" />,
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies color classes according to color prop', () => {
    const { container } = render(
      <CategoryBadge name="Salary" color="emerald" icon="wallet" />,
    );

    const badge = container.querySelector('[data-slot="category-badge"]');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('data-color', 'emerald');
    expect(badge?.className).toContain('text-cat-emerald');
  });

  it('renders archived indicator and styles when archived is true', () => {
    render(
      <CategoryBadge
        name="Old Hobby"
        color="pink"
        icon="film"
        archived={true}
      />,
    );

    const badge = screen.getByTestId('category-badge');
    expect(badge).toHaveAttribute('data-archived', 'true');
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('hides archived badge when showArchivedBadge is false', () => {
    render(
      <CategoryBadge
        name="Old Hobby"
        color="pink"
        icon="film"
        archived={true}
        showArchivedBadge={false}
      />,
    );

    const badge = screen.getByTestId('category-badge');
    expect(badge).toHaveAttribute('data-archived', 'true');
    expect(screen.queryByText('Archived')).not.toBeInTheDocument();
  });
});
