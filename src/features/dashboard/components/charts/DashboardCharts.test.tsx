import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardCharts } from './DashboardCharts';

describe('DashboardCharts', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 500,
      height: 300,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders both chart cards lazily in Suspense', async () => {
    render(
      <DashboardCharts
        categoryExpenses={[]}
        monthlyHistory={[]}
        currency="USD"
      />,
    );

    // Wait for lazy components to resolve
    expect(
      await screen.findByRole(
        'heading',
        { name: /Expenses by Category/i },
        { timeout: 8000 },
      ),
    ).toBeInTheDocument();

    expect(
      await screen.findByRole(
        'heading',
        { name: /Income & Expense Trend/i },
        { timeout: 8000 },
      ),
    ).toBeInTheDocument();
  }, 15000);
});
