import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { AccountTotalsResult } from '../hooks/useAccountTotals';
import { AccountSummaryHeader } from './AccountSummaryHeader';

describe('AccountSummaryHeader', () => {
  const mockTotals: AccountTotalsResult = {
    totalBalance: 125000,
    cashBalance: 25000,
    cardBalance: 50000,
    bankBalance: 50000,
    activeAccountsCount: 3,
    archivedAccountsCount: 1,
  };

  it('renders total balance and active accounts count correctly', () => {
    render(<AccountSummaryHeader totals={mockTotals} currency="USD" />);

    expect(screen.getByTestId('account-summary-header')).toBeInTheDocument();
    // 125000 cents = $1,250.00
    expect(screen.getByText('$1,250.00')).toBeInTheDocument();
    expect(screen.getByText('3 active accounts')).toBeInTheDocument();
  });

  it('renders subtotals for cash, card, and bank assets', () => {
    render(<AccountSummaryHeader totals={mockTotals} currency="USD" />);

    const cashCard = screen.getByTestId('summary-subtotal-cash');
    expect(within(cashCard).getByText('$250.00')).toBeInTheDocument();

    const cardWidget = screen.getByTestId('summary-subtotal-card');
    expect(within(cardWidget).getByText('$500.00')).toBeInTheDocument();

    const bankWidget = screen.getByTestId('summary-subtotal-bank');
    expect(within(bankWidget).getByText('$500.00')).toBeInTheDocument();
  });

  it('handles negative total balance gracefully', () => {
    const negativeTotals: AccountTotalsResult = {
      totalBalance: -15000,
      cashBalance: 0,
      cardBalance: -15000,
      bankBalance: 0,
      activeAccountsCount: 1,
      archivedAccountsCount: 0,
    };

    render(<AccountSummaryHeader totals={negativeTotals} currency="USD" />);

    const header = screen.getByTestId('account-summary-header');
    expect(within(header).getByText('1 active account')).toBeInTheDocument();

    const amounts = screen.getAllByText('−$150.00');
    expect(amounts.length).toBeGreaterThanOrEqual(1);
  });
});
