import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CopyBudgetsDialog } from './CopyBudgetsDialog';

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
});

describe('CopyBudgetsDialog', () => {
  it('renders budget count and triggers onConfirm with overwrite option', async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();
    const handleOpenChange = vi.fn();

    render(
      <CopyBudgetsDialog
        open={true}
        onOpenChange={handleOpenChange}
        sourceMonth="2026-09"
        targetMonth="2026-10"
        sourceBudgetsCount={4}
        onConfirm={handleConfirm}
        isDesktop={true}
      />,
    );

    expect(screen.getByText(/Found 4 budgets to copy/i)).toBeInTheDocument();

    const overwriteSwitch = screen.getByRole('switch');
    await user.click(overwriteSwitch);

    const confirmBtn = screen.getByRole('button', { name: /copy budgets/i });
    await user.click(confirmBtn);

    expect(handleConfirm).toHaveBeenCalledWith({ overwrite: true });
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows empty message and disables confirm button when 0 budgets found', () => {
    render(
      <CopyBudgetsDialog
        open={true}
        onOpenChange={vi.fn()}
        sourceMonth="2026-09"
        targetMonth="2026-10"
        sourceBudgetsCount={0}
        onConfirm={vi.fn()}
        isDesktop={true}
      />,
    );

    expect(screen.getByText(/No budgets found in/i)).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: /copy budgets/i });
    expect(confirmBtn).toBeDisabled();
  });
});
