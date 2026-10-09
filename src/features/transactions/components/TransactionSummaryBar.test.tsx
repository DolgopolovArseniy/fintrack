import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TransactionSummaryBar } from './TransactionSummaryBar';

describe('TransactionSummaryBar', () => {
  it('renders income, expense, and net amounts with appropriate data-testid', () => {
    render(
      <TransactionSummaryBar
        totalIncome={150000}
        totalExpense={65000}
        net={85000}
      />,
    );

    expect(screen.getByTestId('transaction-summary-bar')).toBeInTheDocument();
    expect(screen.getByTestId('summary-income')).toBeInTheDocument();
    expect(screen.getByTestId('summary-expense')).toBeInTheDocument();
    expect(screen.getByTestId('summary-net')).toBeInTheDocument();

    expect(screen.getByText(/1[.,\s]?500/)).toBeInTheDocument();
    expect(screen.getByText(/650/)).toBeInTheDocument();
    expect(screen.getByText(/850/)).toBeInTheDocument();
  });
});
