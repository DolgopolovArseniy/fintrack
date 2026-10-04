import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('min-width: 768px'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it('renders title, description and action buttons when open', () => {
    const handleOpenChange = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onOpenChange={handleOpenChange}
        title="Confirm action"
        description="Are you sure you want to proceed?"
        onConfirm={handleConfirm}
      />,
    );

    expect(screen.getByText('Confirm action')).toBeInTheDocument();
    expect(
      screen.getByText('Are you sure you want to proceed?'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /confirm/i }),
    ).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const handleConfirm = vi.fn();
    const handleOpenChange = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onOpenChange={handleOpenChange}
        title="Delete item"
        confirmLabel="Yes, delete"
        variant="destructive"
        onConfirm={handleConfirm}
      />,
    );

    const confirmButton = screen.getByRole('button', { name: 'Yes, delete' });
    fireEvent.click(confirmButton);

    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel and closes when cancel button is clicked', () => {
    const handleCancel = vi.fn();
    const handleOpenChange = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onOpenChange={handleOpenChange}
        title="Archive category"
        cancelLabel="No, keep it"
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />,
    );

    const cancelButton = screen.getByRole('button', { name: 'No, keep it' });
    fireEvent.click(cancelButton);

    expect(handleCancel).toHaveBeenCalledTimes(1);
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables buttons when isLoading is true', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        title="Archiving..."
        isLoading={true}
        onConfirm={vi.fn()}
      />,
    );

    const buttons = screen.getAllByRole('button');
    for (const btn of buttons) {
      expect(btn).toBeDisabled();
    }
  });
});
