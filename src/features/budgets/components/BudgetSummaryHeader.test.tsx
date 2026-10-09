import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BudgetSummaryTotals } from '../schemas';
import { BudgetSummaryHeader } from './BudgetSummaryHeader';

describe('BudgetSummaryHeader', () => {
  const sampleTotals: BudgetSummaryTotals = {
    totalLimit: 5000000, // 50,000.00
    totalSpent: 3200000, // 32,000.00
    totalRemaining: 1800000,
    totalOverspent: 0,
    overallProgress: 64,
    overallStatus: 'normal',
    budgetCount: 4,
    normalCount: 2,
    warningCount: 1,
    exceededCount: 1,
  };

  it('renders summary metrics, progress bar and status badges', () => {
    render(<BudgetSummaryHeader summaryTotals={sampleTotals} />);

    expect(screen.getByText('Total Budgeted')).toBeInTheDocument();
    expect(screen.getByText('Total Spent')).toBeInTheDocument();
    expect(screen.getByText('Remaining')).toBeInTheDocument();
    expect(screen.getByText('64%')).toBeInTheDocument();

    expect(screen.getByText('2 on track')).toBeInTheDocument();
    expect(screen.getByText('1 near limit')).toBeInTheDocument();
    expect(screen.getByText('1 exceeded')).toBeInTheDocument();
  });

  it('renders overspent label when total spent exceeds limit', () => {
    const overspentTotals: BudgetSummaryTotals = {
      ...sampleTotals,
      totalLimit: 1000000,
      totalSpent: 1500000,
      totalRemaining: 0,
      totalOverspent: 500000,
      overallProgress: 150,
      overallStatus: 'exceeded',
    };

    render(<BudgetSummaryHeader summaryTotals={overspentTotals} />);
    expect(screen.getByText('Overspent')).toBeInTheDocument();
  });
});
