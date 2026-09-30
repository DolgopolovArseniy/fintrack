import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '@/lib/errors';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('renders default error view and invokes onRetry', () => {
    const handleRetry = vi.fn();
    render(<ErrorState onRetry={handleRetry} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    const retryButton = screen.getByRole('button');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders specific translation description for known AppError codes', () => {
    const notFoundError = new AppError('not-found');
    render(<ErrorState error={notFoundError} />);

    expect(
      screen.getByText('The requested resource was not found.'),
    ).toBeInTheDocument();
  });
});
