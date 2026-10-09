import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Account } from '../schemas';
import { AccountCard } from './AccountCard';

describe('AccountCard', () => {
  const mockAccount: Account = {
    id: 'acc-1',
    name: 'Debit Card',
    type: 'card',
    balance: 50000,
    initialBalance: 20000,
    archived: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const defaultProps = {
    account: mockAccount,
    onEdit: vi.fn(),
    onArchive: vi.fn(),
    onUnarchive: vi.fn(),
    onRecalculate: vi.fn(),
    isRecalculating: false,
    canArchive: true,
    currency: 'USD' as const,
  };

  it('renders account name, type, and balances correctly', () => {
    render(<AccountCard {...defaultProps} />);

    expect(screen.getByText('Debit Card')).toBeInTheDocument();
    expect(screen.getByText('Card')).toBeInTheDocument();
    expect(screen.getByText('$500.00')).toBeInTheDocument();
    expect(screen.getByText('$200.00')).toBeInTheDocument();
  });

  it('calls onEdit when edit item is clicked in actions menu', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();

    render(<AccountCard {...defaultProps} onEdit={onEdit} />);

    const menuTrigger = screen.getByTestId('account-actions-acc-1');
    await user.click(menuTrigger);

    const editButton = await screen.findByTestId('account-edit-acc-1');
    await user.click(editButton);

    expect(onEdit).toHaveBeenCalledWith(mockAccount);
  });

  it('calls onRecalculate when recalculate balance is clicked', async () => {
    const user = userEvent.setup();
    const onRecalculate = vi.fn();

    render(<AccountCard {...defaultProps} onRecalculate={onRecalculate} />);

    const menuTrigger = screen.getByTestId('account-actions-acc-1');
    await user.click(menuTrigger);

    const recalcButton = await screen.findByTestId('account-recalculate-acc-1');
    await user.click(recalcButton);

    expect(onRecalculate).toHaveBeenCalledWith(mockAccount);
  });

  it('calls onArchive for active account and onUnarchive for archived account', async () => {
    const user = userEvent.setup();
    const onArchive = vi.fn();
    const onUnarchive = vi.fn();

    // 1. Active account
    const { rerender } = render(
      <AccountCard {...defaultProps} onArchive={onArchive} />,
    );
    await user.click(screen.getByTestId('account-actions-acc-1'));
    await user.click(await screen.findByTestId('account-archive-acc-1'));
    expect(onArchive).toHaveBeenCalledWith(mockAccount);

    // 2. Archived account
    const archivedAccount: Account = {
      ...mockAccount,
      archived: true,
    };
    rerender(
      <AccountCard
        {...defaultProps}
        account={archivedAccount}
        onUnarchive={onUnarchive}
      />,
    );

    expect(screen.getByText('Archived')).toBeInTheDocument();
    await user.click(screen.getByTestId('account-actions-acc-1'));
    await user.click(await screen.findByTestId('account-unarchive-acc-1'));
    expect(onUnarchive).toHaveBeenCalledWith(archivedAccount);
  });

  it('prevents archiving when canArchive is false (last active account protection)', async () => {
    const user = userEvent.setup();
    const onArchive = vi.fn();

    render(
      <AccountCard
        {...defaultProps}
        canArchive={false}
        onArchive={onArchive}
      />,
    );

    await user.click(screen.getByTestId('account-actions-acc-1'));
    const archiveItem = await screen.findByTestId('account-archive-acc-1');
    await user.click(archiveItem);

    expect(onArchive).not.toHaveBeenCalled();
  });
});
