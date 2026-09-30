import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LoadingSkeleton } from './LoadingSkeleton';

describe('LoadingSkeleton', () => {
  it('renders default list variant with accessible status role', () => {
    render(<LoadingSkeleton />);
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(status).toHaveAttribute('aria-busy', 'true');
  });

  it('renders card variant with custom count', () => {
    const { container } = render(<LoadingSkeleton variant="card" count={2} />);
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    // 2 cards rendered inside the grid
    expect(container.querySelectorAll('.bg-card')).toHaveLength(2);
  });

  it('renders chart variant', () => {
    const { container } = render(<LoadingSkeleton variant="chart" />);
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(container.querySelector('.h-60')).toBeInTheDocument();
  });
});
