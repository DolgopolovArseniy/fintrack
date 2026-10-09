import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BudgetProgressBar } from './BudgetProgressBar';

describe('BudgetProgressBar', () => {
  it('renders progressbar with correct accessibility attributes', () => {
    render(
      <BudgetProgressBar
        progress={65}
        status="normal"
        ariaLabel="Food Budget"
        ariaValueText="65% used"
      />,
    );

    const bar = screen.getByRole('progressbar', { name: 'Food Budget' });
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveAttribute('aria-valuenow', '65');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuetext', '65% used');
  });

  it('clamps width and valuenow for overspent budget (> 100%)', () => {
    render(<BudgetProgressBar progress={140} status="exceeded" />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '100');
    expect(bar).toHaveAttribute('data-status', 'exceeded');
    expect(bar).toHaveAttribute('data-progress', '140');
  });

  it('handles negative or 0 progress cleanly', () => {
    render(<BudgetProgressBar progress={-10} status="normal" />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
  });
});
