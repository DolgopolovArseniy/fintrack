import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CurrencyChangeDialog } from './CurrencyChangeDialog';

describe('CurrencyChangeDialog', () => {
  it('renders title and warning description when open', () => {
    render(
      <CurrencyChangeDialog
        open={true}
        onOpenChange={vi.fn()}
        targetCurrency="EUR"
        onConfirm={vi.fn()}
        isDesktop={true}
      />,
    );

    expect(screen.getByText('Change base currency?')).toBeInTheDocument();
    expect(
      screen.getByText(/Changing the base currency only updates/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /I understand, change currency/i }),
    ).toBeInTheDocument();
  });

  it('calls onConfirm and closes dialog when user clicks confirm', async () => {
    const user = userEvent.setup();
    const onConfirmMock = vi.fn().mockResolvedValue(undefined);
    const onOpenChangeMock = vi.fn();

    render(
      <CurrencyChangeDialog
        open={true}
        onOpenChange={onOpenChangeMock}
        targetCurrency="EUR"
        onConfirm={onConfirmMock}
        isDesktop={true}
      />,
    );

    const confirmBtn = screen.getByRole('button', {
      name: /I understand, change currency/i,
    });
    await user.click(confirmBtn);

    expect(onConfirmMock).toHaveBeenCalledTimes(1);
    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
  });

  it('calls onOpenChange(false) when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirmMock = vi.fn();
    const onOpenChangeMock = vi.fn();

    render(
      <CurrencyChangeDialog
        open={true}
        onOpenChange={onOpenChangeMock}
        targetCurrency="EUR"
        onConfirm={onConfirmMock}
        isDesktop={true}
      />,
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelBtn);

    expect(onConfirmMock).not.toHaveBeenCalled();
    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
  });

  it('disables buttons when isLoading is true', () => {
    render(
      <CurrencyChangeDialog
        open={true}
        onOpenChange={vi.fn()}
        targetCurrency="EUR"
        onConfirm={vi.fn()}
        isLoading={true}
        isDesktop={true}
      />,
    );

    expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Saving.../i })).toBeDisabled();
  });
});
