import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Account } from '../schemas';
import { AccountForm } from './AccountForm';

describe('AccountForm', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSubmit: vi.fn(),
    isSubmitting: false,
    currency: 'USD' as const,
  };

  it('renders create mode with default fields and validates required name', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<AccountForm {...defaultProps} onSubmit={onSubmit} />);

    expect(screen.getByText('Create account')).toBeInTheDocument();

    // Try submitting without filling name
    const submitBtn = screen.getByTestId('account-form-submit');
    await user.click(submitBtn);

    expect(await screen.findByTestId('account-name-error')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits valid data in create mode', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<AccountForm {...defaultProps} onSubmit={onSubmit} />);

    // 1. Enter name
    const nameInput = screen.getByTestId('account-name-input');
    await user.type(nameInput, 'Freedom Bank');

    // 2. Select Bank type
    const bankTypeBtn = screen.getByTestId('account-type-bank');
    await user.click(bankTypeBtn);

    // 3. Enter initial balance: e.g. 100 -> $100.00 = 10000 minor units
    const amountInput = screen.getByTestId('account-initial-balance-input');
    await user.type(amountInput, '100.00');

    // 4. Submit
    const submitBtn = screen.getByTestId('account-form-submit');
    await user.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Freedom Bank',
        type: 'bank',
        initialBalance: 10000,
        archived: false,
      }),
    );
  });

  it('populates initialData in edit mode and allows updating', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    const existingAccount: Account = {
      id: 'acc-42',
      name: 'Old Wallet',
      type: 'cash',
      balance: 5000,
      initialBalance: 5000,
      archived: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };

    render(
      <AccountForm
        {...defaultProps}
        initialData={existingAccount}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText('Edit account')).toBeInTheDocument();
    const nameInput = screen.getByTestId('account-name-input');
    expect(nameInput).toHaveValue('Old Wallet');

    await user.clear(nameInput);
    await user.type(nameInput, 'New Wallet');

    const submitBtn = screen.getByTestId('account-form-submit');
    await user.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Wallet',
        type: 'cash',
        initialBalance: 5000,
      }),
    );
  });

  it('cancels and calls onOpenChange(false) when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(<AccountForm {...defaultProps} onOpenChange={onOpenChange} />);

    const cancelBtn = screen.getByTestId('account-form-cancel');
    await user.click(cancelBtn);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
