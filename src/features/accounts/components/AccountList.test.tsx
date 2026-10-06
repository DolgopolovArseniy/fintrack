import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Account } from '../schemas';
import { AccountList } from './AccountList';

describe('AccountList', () => {
  const createAccount = (
    id: string,
    name: string,
    archived = false,
  ): Account => ({
    id,
    name,
    type: 'card',
    balance: 10000,
    initialBalance: 10000,
    archived,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  const defaultProps = {
    accounts: [],
    onEdit: vi.fn(),
    onArchive: vi.fn(),
    onUnarchive: vi.fn(),
    onRecalculate: vi.fn(),
  };

  it('renders custom emptyState when accounts array is empty', () => {
    render(
      <AccountList
        {...defaultProps}
        accounts={[]}
        emptyState={<div data-testid="custom-empty">No accounts found</div>}
      />,
    );

    expect(screen.getByTestId('custom-empty')).toBeInTheDocument();
  });

  it('renders grid of account cards when accounts are provided', () => {
    const accounts: Account[] = [
      createAccount('1', 'Primary Card'),
      createAccount('2', 'Cash Wallet'),
      createAccount('3', 'Savings Account', true),
    ];

    render(<AccountList {...defaultProps} accounts={accounts} />);

    expect(screen.getByTestId('account-list')).toBeInTheDocument();
    expect(screen.getByTestId('account-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('account-card-2')).toBeInTheDocument();
    expect(screen.getByTestId('account-card-3')).toBeInTheDocument();
  });
});
